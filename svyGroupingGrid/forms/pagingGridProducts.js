/**
 * @properties={typeid:24,uuid:"CCC1CE00-2945-49EF-AD06-C96D53152EE2"}
 */
function showUIGrid() {
	var q = datasources.db.example_data.order_details.createSelect();
	
	/** @type{QBJoin<db:/example_data/products>} */
	var jProducts = q.joins.add(datasources.db.example_data.products.getDataSource());
	jProducts.on.add(q.columns.productid.eq(jProducts.columns.productid));
	
	/** @type{QBJoin<db:/example_data/orders>} */
	var jOrders = q.joins.add(datasources.db.example_data.orders.getDataSource());
	jOrders.on.add(q.columns.orderid.eq(jOrders.columns.orderid));
	
	/** @type{QBJoin<db:/example_data/customers>} */
	var jCustomers = q.joins.add(datasources.db.example_data.customers.getDataSource());
	jCustomers.on.add(jOrders.columns.customerid.eq(jCustomers.columns.customerid));	
	
	q.result.add(jCustomers.columns.companyname, 'CustomerName');
	q.result.add(jOrders.columns.orderdate.year, 'Year');
	q.result.add(jOrders.columns.orderdate.month, 'Month');
	q.result.add(q.columns.quantity);
	q.result.add(q.columns.unitprice);
	
	// filter on product
	q.where.add(jProducts.columns.productname.like(foundset.productname));
	
	var ds = databaseManager.getDataSetByQuery(q, -1);
	elements.uigrid.dataset = ds;
	
	defaultGrouping()
}

/**
 * @protected 
 * @properties={typeid:24,uuid:"641AE2C6-D058-4D96-8046-3DA56F5D9D5B"}
 */
function defaultGrouping() {
	elements.uigrid.groupColumn(0);
	elements.uigrid.groupColumn(1);
}

/**
 * @properties={typeid:24,uuid:"7720ED0B-602F-412E-BF82-A3DFECCA546A"}
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
 * @properties={typeid:24,uuid:"61F8E050-8B0D-49F1-B11E-8851B8CEA1E3"}
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
 * @properties={typeid:24,uuid:"829704BD-EF83-45B8-A0DB-C5C3A66D4120"}
 */
function onAction(event) {
	// TODO Auto-generated method stub
	elements.uigrid.setSelectedIndex(11)
}

/**
 * @override 
 * @protected 
 * @properties={typeid:24,uuid:"8B0B6A03-D39D-4F67-BD35-21B5AE391308"}
 */
function getTableCount() {
	if (elements.uigrid.dataset) {
		/** @type {JSDataSet} */
		var ds = elements.uigrid.dataset;
		pageCount = ds.getMaxRowIndex();
		currentPage = pageCount;
	}
}
