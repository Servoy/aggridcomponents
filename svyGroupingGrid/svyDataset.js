/**
 * @param {String|QBSelect|JSFoundSet} dataSourceOrQueryOrFoundset
 * @constructor
 *
 * @properties={typeid:24,uuid:"AB5D1A88-0D20-48C3-9FB6-2CB4F7A9EF37"}
 */
function DataSetManager(dataSourceOrQueryOrFoundset) {
	this.dataSource = dataSourceOrQueryOrFoundset;
	var lookupQuery;
	// TODO should be just a foundset query, and duplicate the lookup query ?

	/** @type {QBSelect} */
	if (dataSourceOrQueryOrFoundset instanceof String) { // is a datasource
		this.query = databaseManager.createSelect(dataSourceOrQueryOrFoundset);
		/** @type {QBSelect} */
		lookupQuery = databaseManager.createSelect(dataSourceOrQueryOrFoundset);
	} else if (dataSourceOrQueryOrFoundset instanceof QBSelect) { // is a query
		this.query = dataSourceOrQueryOrFoundset;
		this.dataSource = dataSourceOrQueryOrFoundset.getDataSource();
	} else if (dataSourceOrQueryOrFoundset instanceof JSFoundSet) {
		this.query = dataSourceOrQueryOrFoundset.getQuery();
		this.dataSource = dataSourceOrQueryOrFoundset.getDataSource();
	} else {
		throw "DataSource not Valid"
	}

	this.pageSize = 10;
	var rowCount = 0;
	var offset = 0;
	var page = 1;

	/** @type {JSDataSet} */
	var datasetCache;

	// 	var relations = {};
	var joins = { };
	/** @type {Array<{dataProvider: String, name: String, functionResult, Function}>} */
	var result = [];

	/** @type {Array<String>} */
	var grouping = [];

	var _this = this;

	/**
	 * @public
	 * @return {Array<{dataProvider: String, name: String, functionResult, Function}>}
	 * */
	this.getResults = function() {
		return result;
	}

	/**
	 * @param {String} dataProvider
	 * @param {String} [name]
	 * @param {Function} [functionResult]
	 * @public
	 *
	 * */
	this.addResult = function(dataProvider, name, functionResult) {

		var rel = getRelations(dataProvider);

		if (rel.length) { // has relation

			var relpath = "";
			for (var i = 0; i < rel.length; i++) { // add a join for each relation

				// get the join root, could be the query or a join
				var joinRoot = getJoinRoot(relpath);
				relpath += relpath ? "." + rel[i] : rel[i];

				if (!joins[relpath]) {
					joins[relpath] = joinRoot.joins.add(rel[i], rel[i]);
				}
			}
		}

		/** @type {QBColumn} */
		var qColumn = getResultColumn(dataProvider, functionResult);
		_this.query.result.add(qColumn, name);

		// push dataProvider in result
		result.push({
			dataProvider: dataProvider,
			name: name,
			functionResult: functionResult
		});
	}

	/** @return {QBSelect} */
	function getJoinRoot(path) {
		return joins[path] || _this.query;
	}

	function persistGroup(dataProvider) {
		grouping.push(dataProvider);
	}

	function persistUngroup(dataProvider) {
		var idx = grouping.indexOf(dataProvider);
		grouping = grouping.splice(idx, 1);
		application.output(grouping);
	}

	function getResultColumn(dataProvider, functionResult) {
		var fullrel = getRelationsName(dataProvider);
		var dataProviderName = getDataProviderName(dataProvider);
		var queryRoot = getJoinRoot(fullrel);

		/** @type {QBColumn} */
		var qColumn = queryRoot.getColumn(dataProviderName);

		if (functionResult) {
			qColumn = functionResult.call(this, qColumn);
		}
		return qColumn;
	}

	function getLastRow() {
		if (datasetCache) {
			return datasetCache[datasetCache.getMaxRowIndex() - 1];
		}
		return null;
	}

	function getFirstRow() {
		if (datasetCache) {
			return datasetCache[0];
		}
		return null;
	}

	function getDataSetColumnIndex(columnName) {
		var columnNames = datasetCache.getColumnNames();
		return columnNames.indexOf(columnName);
	}

	/**
	 * @param {Number} maxRows
	 * @public
	 * @return {JSDataSet}
	 *
	 * */
	this.getDataSet = function(maxRows) {
		application.output(databaseManager.getSQL(_this.query));
		application.output(databaseManager.getSQLParameters(_this.query));
		datasetCache = databaseManager.getDataSetByQuery(_this.query, maxRows);
		application.output(datasetCache)
		return datasetCache;
	}

	/**
	 * @param {Number} columnIndex
	 * @param {String} value
	 *
	 * @return {JSDataSet}
	 * @public
	 *
	 * */
	this.lookupValue = function(columnIndex, value) {
		var column = getResultColumn(result[columnIndex].dataProvider, result[columnIndex].functionResult);
		var lookupQuery = databaseManager.createSelect(this.query.getDataSource());

		// copy joins
		var queryJoins = this.query.joins.getJoins();
		for (var i = 0; i < queryJoins.length; i++) {
		}

		this.query.where.remove('lookup');
		this.query.where.add('lookup', column.eq(value));
		var ds = this.getDataSet(-1);
		this.query.where.remove('lookup');
		return ds;
	}

	/**
	 * @param {Number} columnIndex
	 * @param {Number} groupIndex
	 *
	 * @return {JSDataSet}
	 * @public
	 *
	 * */
	this.groupValue = function(columnIndex, groupIndex) {

		// TODO: fix invisible columns
		var column = getResultColumn(result[columnIndex].dataProvider, result[columnIndex].functionResult);

		if (groupIndex === 0) { // group the column
			// sorted by the given column
			this.query.result.clear();

			for (var i = 0; i < result.length; i++) {
				/** @type {QBColumn} */
				var qColumn = getResultColumn(result[i].dataProvider, result[i].functionResult);
				if (i === columnIndex) {
					persistGroup(result[i].dataProvider);
				}

				this.query.result.add(qColumn.min, result[i].dataProvider.replace(/\./g, '_'));
			}

			// FIXME has side effect on the sort and grouby
			this.query.groupBy.clear();
			this.query.groupBy.add(column);
			this.query.sort.clear();
			this.query.sort.add(column);
			this.query.where.remove('offset');

		} else if (isNaN(groupIndex)) { // TODO check if is the first column, ungroup the column
			// sorted by the given column
			this.query.result.clear();

			for (var i = 0; i < result.length; i++) {

				/** @type {QBColumn} */
				var qColumn = getResultColumn(result[i].dataProvider, result[i].functionResult);
				if (i === columnIndex) {
					persistUngroup(result[i].dataProvider);
				}

				// TODO possible functions on column
				this.query.result.add(qColumn);
			}

			// FIXME has side effect on the sort and grouby
			this.query.groupBy.clear();
			this.query.groupBy.add(column);
			this.query.sort.clear();
			this.query.sort.add(column);
			this.query.where.remove('offset');

		} else {
			// priority of column is 2, just store it.
		}

		var ds = this.getDataSet(10);
		return ds;
	}

	this.loadNextChunk = function() {
		//		// update the offset
		//		if (offsetDiff && ((offsetDiff*pageSize) + offset) > 0 && ((offsetDiff*pageSize) + offset <= pageCount)) {
		//			offset += offsetDiff*pageSize;
		//			pageOffset = Math.floor(offset / pageSize);
		//		}
		//
		//		var ds = getDataSet(offsetDiff);
		//
		//		currentPage = pageOffset * pageSize + ds.getMaxRowIndex();
		//		elements.uigrid.dataset = ds;

		addOffset(1);
		return this.getDataSet(this.pageSize);
	}

	this.loadPrevChunk = function() {
		addOffset(-1)
	}

	/**
	 * @param {Number} diff it can be 0 1 or -1
	 * @protected
	 * */
	function addOffset(diff) {
		var row;
		var pk
		var i;
		var pks = databaseManager.getTable(_this.dataSource).getRowIdentifierColumnNames();

		// FIXME should not go over max
		// FIXME go previous
		switch (diff) {
		case 1:

			var queryFunction;
			var pkValue
			if (grouping[0]) { // offset on the grouped column
				// the grouped column
				var groupedColumn = grouping[0];
				
				var root = getJoinRoot(getRelationsName(groupedColumn));
				var columnName = getDataProviderName(groupedColumn);
				queryFunction = root.getColumn(columnName);
				pkValue = datasetCache.getValue(datasetCache.getMaxRowIndex(), getDataSetColumnIndex(groupedColumn.replace(/\./g, '_')));
				
				application.output(pkValue)
				_this.query.sort.clear();
				_this.query.sort.add(queryFunction);
				
			} else {
				//row = getLastRow();
				queryFunction = _this.query.getColumn(pks[0]);
				pkValue = datasetCache.getValue(datasetCache.getMaxRowIndex(), getDataSetColumnIndex(pks[0]));//row[pks[0]];

				if (pks.length > 1) { // concatenate the pk to get an unique value well sorted
					queryFunction = queryFunction.cast(QUERY_COLUMN_TYPES.TYPE_TEXT); // force cast to text
					for (i = 1; i < pks.length; i++) {
						pk = pks[i]
						queryFunction = queryFunction.concat(_this.query.getColumn(pk)).cast(QUERY_COLUMN_TYPES.TYPE_TEXT);
						pkValue += "" + datasetCache.getValue(datasetCache.getMaxRowIndex(), getDataSetColumnIndex(pk)); //row[pk];
					}
				}
				
				sortPkAsc();
			}

			_this.query.where.remove('offset')
			_this.query.where.add('offset', queryFunction.gt(pkValue));
		//query.where.add(query.getColumn(pk).gt(row[pk]));
			break;
		case 0: // cascate
			//_this.query.result.addPk();
			sortPkAsc();
			break;
		case -1:
			row = getFirstRow();
			_this.query.sort.clear();
			for (i = 0; i < pks.length; i++) {
				application.output(row[pk]);
				pk = pks[i]
				_this.query.sort.add(_this.query.getColumn(pk).desc);
				_this.query.where.add(_this.query.getColumn(pk).lt(row[pk]));
			}
			break;
		default:
			break;
		}

		function sortPkAsc() {
			_this.query.sort.clear();
			_this.query.sort.addPk();
		}

		function sortPkDesc() {
			_this.query.sort.clear();
			for (var j = 0; j < pks.length; j++) {
				_this.query.sort.add(_this.query.getColumn(pks[j]).desc);
			}
		}

	}
}

/**
 * @param {String} dataProvider
 *
 * @properties={typeid:24,uuid:"87D941E5-A21F-4E71-8ED5-0AD8AFD913C9"}
 */
function getRelations(dataProvider) {
	var relationStack = dataProvider.split(".");
	return relationStack.slice(0, relationStack.length - 1);
}

/**
 * @param {String} dataProvider
 *
 * @properties={typeid:24,uuid:"1CB35E08-49EE-4DA2-9CA1-D741D18AEF8E"}
 */
function getRelationsName(dataProvider) {
	var relationStack = getRelations(dataProvider);
	return relationStack.join(".");
}

/**
 * @param {String} dataProvider
 *
 * @properties={typeid:24,uuid:"C1F7538D-355D-4215-A9A5-17E8DBFBC60A"}
 */
function getDataProviderName(dataProvider) {
	var relationStack = dataProvider.split(".");
	return relationStack[relationStack.length - 1]
}

/**
 * @private
 *
 * @properties={typeid:24,uuid:"48CA1325-2DF6-4AC8-A1F9-76A555FEB760"}
 */
function testDataSet() {

	var dataSetManager = new DataSetManager("db:/example_data/order_details");
	dataSetManager.addResult('order_details_to_products.productname', 'Product');
	dataSetManager.addResult('order_details_to_products.products_to_suppliers.companyname', 'Supplier');
	dataSetManager.addResult('order_details_to_orders.orders_to_customers.companyname', 'Customer');
	dataSetManager.addResult('order_details_to_orders.orderdate', 'Year', orderDateToYear);
	dataSetManager.addResult('order_details_to_orders.orderdate', 'Month', orderDateToMonth);
	dataSetManager.addResult('quantity', 'quantity');
	dataSetManager.addResult('unitprice', 'unitprice');

	/**
	 * @param {QBColumn} column
	 * @return {QBColumn}
	 * */
	function orderDateToYear(column) {
		return column.year;
	}

	/**
	 * @param {QBColumn} column
	 * @return {QBColumn}
	 * */
	function orderDateToMonth(column) {
		return column.month;
	}

	var ds1 = dataSetManager.getDataSet(-1);
	var ds2 = getTestDataset();

	for (var i = 0; i < ds1.getMaxRowIndex(); i++) {
		for (var j = 1; j <= ds1.getMaxColumnIndex(); j++) {
			jsunit.assertEquals(ds1.getValue(i, j), ds2.getValue(i, j))
		}
	}

}

/**
 * @private
 *
 * @properties={typeid:24,uuid:"6FEA90A7-B957-4F80-9A91-60012B79FBBA"}
 */
function getTestDataset() {

	var q = datasources.db.example_data.order_details.createSelect();

	/** @type{QBJoin<db:/example_data/products>} */
	var jProducts = q.joins.add(datasources.db.example_data.products.getDataSource());
	jProducts.on.add(q.columns.productid.eq(jProducts.columns.productid));

	/** @type{QBJoin<db:/example_data/suppliers>} */
	var jSuppliers = jProducts.joins.add(datasources.db.example_data.suppliers.getDataSource(), JSRelation.LEFT_OUTER_JOIN);
	jSuppliers.on.add(jProducts.columns.supplierid.eq(jSuppliers.columns.supplierid));

	/** @type{QBJoin<db:/example_data/orders>} */
	var jOrders = q.joins.add(datasources.db.example_data.orders.getDataSource());
	jOrders.on.add(q.columns.orderid.eq(jOrders.columns.orderid));

	/** @type{QBJoin<db:/example_data/customers>} */
	var jCustomers = q.joins.add(datasources.db.example_data.customers.getDataSource());
	jCustomers.on.add(jOrders.columns.customerid.eq(jCustomers.columns.customerid));

	q.result.add(jProducts.columns.productname, 'Product');
	q.result.add(jSuppliers.columns.companyname, 'Supplier');
	q.result.add(jCustomers.columns.companyname, 'Customer');
	q.result.add(jOrders.columns.orderdate.year, 'Year');
	q.result.add(jOrders.columns.orderdate.month, 'Month');
	q.result.add(q.columns.quantity);
	q.result.add(q.columns.unitprice);

	return databaseManager.getDataSetByQuery(q, -1);
}
