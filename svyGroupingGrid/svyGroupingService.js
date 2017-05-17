/**
 * @param {JSFoundSet} foundset
 * @constructor
 *
 * @properties={typeid:24,uuid:"281F0F42-D69A-4D7F-A3DA-245327A42F89"}
 */
function GroupService(foundset) {
	this.dataSource = foundset.getDataSource();
	this.query = foundset.getQuery();
	var lookupQuery = foundset.getQuery();

	this.pageSize = 10;
	var rowCount = 0;
	var offset = 0;

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

		getJoin(dataProvider);

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
		return joins[path] || this.query;
	}

	function getJoin(dataProvider) {
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

		var column = getResultColumn(result[columnIndex].dataProvider, result[columnIndex].functionResult);

		if (groupIndex === 0) { // group the column
			// sorted by the given column
			this.query.result.clear();

			for (var i = 0; i < result.length; i++) {
				/** @type {QBColumn} */
				var qColumn = getResultColumn(result[i].dataProvider, result[i].functionResult);
				if (i === columnIndex) {
					application.output('SI E LEI');
					persistGroup(result[i].dataProvider);
				}

				this.query.result.add(qColumn.min);
			}

			// FIXME has side effect on the sort and grouby
			this.query.groupBy.clear();
			this.query.groupBy.add(column);
			this.query.sort.clear();
			this.query.sort.add(column);

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

		} else {
			// priority of column is 2, just store it.
		}

		var ds = this.getDataSet(-1);
		return ds;
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
			row = getLastRow();
			var queryFunction = _this.query.getColumn(pks[0]);
			var pkValue = row[pks[0]];

			if (pks.length > 1) { // concatenate the pk to get an unique value well sorted
				queryFunction = queryFunction.cast(QUERY_COLUMN_TYPES.TYPE_TEXT); // force cast to text
				for (i = 1; i < pks.length; i++) {
					pk = pks[i]
					queryFunction = queryFunction.concat(_this.query.getColumn(pk)).cast(QUERY_COLUMN_TYPES.TYPE_TEXT);
					pkValue += "" + row[pk];
				}
			}

			_this.query.where.add(queryFunction.gt(pkValue));
		//query.where.add(query.getColumn(pk).gt(row[pk]));
		case 0: // cascate
			_this.query.result.addPk();
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
 * @properties={typeid:24,uuid:"30646A08-C110-4DCB-B1D4-FC4661BB0271"}
 */
function getRelations(dataProvider) {
	var relationStack = dataProvider.split(".");
	return relationStack.slice(0, relationStack.length - 1);
}

/**
 * @param {String} dataProvider
 *
 * @properties={typeid:24,uuid:"0BAB2A1B-0057-49A5-9B57-F189E0D4EEF7"}
 */
function getRelationsName(dataProvider) {
	var relationStack = getRelations(dataProvider);
	return relationStack.join(".");
}

/**
 * @param {String} dataProvider
 *
 * @properties={typeid:24,uuid:"79E671FD-10A7-4765-A31C-0A517F1F4B08"}
 */
function getDataProviderName(dataProvider) {
	var relationStack = dataProvider.split(".");
	return relationStack[relationStack.length - 1]
}

/**
 * @private
 *
 * @properties={typeid:24,uuid:"945AFCF8-15F0-44B8-A4FD-9FBA3471E9EF"}
 */
function testDataSet() {

	var fs = datasources.db.example_data.order_details.getFoundSet();
	fs.loadAllRecords();

	var dataSetManager = new GroupService(fs);
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
 * @properties={typeid:24,uuid:"23E852AD-7EC1-4D6F-8A41-2276E5845747"}
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
