/**
 * @properties={typeid:24,uuid:"E104B3AD-5044-4487-8006-4ED4F4E6E404"}
 */
function showUIGrid() {
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
	q.result.add(jCustomers.columns.companyname, 'CustomerName');
	q.result.add(jOrders.columns.orderdate.year, 'Year');
	q.result.add(jOrders.columns.orderdate.month, 'Month');
	q.result.add(q.columns.quantity);
	q.result.add(q.columns.unitprice);
	
	// filter on product
	q.where.add(jSuppliers.columns.companyname.eq(foundset.companyname));
	
	var ds = databaseManager.getDataSetByQuery(q, -1);
	elements.uigrid.dataset = ds;
	//elements.uigrid.init(ds,['supplier', 'customer', 'productname'], ['year'], ['quantity']);
	defaultGrouping();
}

/**
 * @protected 
 * @properties={typeid:24,uuid:"1BAE0183-8C91-4D38-B018-B8805ADE6180"}
 */
function defaultGrouping() {
	elements.uigrid.groupColumn(0);
	elements.uigrid.groupColumn(1);
	elements.uigrid.groupColumn(2);
}

/**
 * @override 
 * @protected 
 * @properties={typeid:24,uuid:"93E673B1-7D9D-4CE3-8D64-8B6470CBC467"}
 */
function getTableCount() {
	if (elements.uigrid.dataset) {
		/** @type {JSDataSet} */
		var ds = elements.uigrid.dataset;
		pageCount = ds.getMaxRowIndex();
		currentPage = pageCount;
	}
}


/**
 * @properties={typeid:24,uuid:"976F8839-9926-44B6-BDC7-E8ABBF13C9C1"}
 */
function emptyDs () {
	var ds = databaseManager.createEmptyDataSet();
	elements.uigrid.dataset = ds;
}

/**
 * Called when a row is selected.
 *
 * @param {Number} index
 * @param {object} [row]
 * @param {JSEvent} [event]
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"FE2E6BAF-D275-4F9E-9763-5DA5357EA91B"}
 */
function onRowSelected(index, row, event) {
	// TODO Auto-generated method stub
	application.output(index)
	application.output(row)
	application.output(event.getElementName())
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"8D8535D6-A216-4241-9465-4E3C4263C4C7"}
 */
function onAction(event) {
	// TODO Auto-generated method stub
	elements.uigrid.setSelectedIndex(11)
}
