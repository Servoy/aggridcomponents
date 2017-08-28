

/**
 * @properties={typeid:24,uuid:"71B50E58-0ADB-4AB5-BE9A-82D5C6C0959E"}
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
 * @properties={typeid:24,uuid:"BD8B97AF-F849-4A33-B72E-9A831438CF61"}
 */
function defaultGrouping() {
	elements.uigrid.groupColumn(0);
	elements.uigrid.groupColumn(1);
}

/**
 * @properties={typeid:24,uuid:"DEC2AAE5-8EE1-4DC7-AF25-86EDCF7C2157"}
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
 * @properties={typeid:24,uuid:"5FC8EBE7-76F5-45D6-8835-D5480414B62C"}
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
 * @properties={typeid:24,uuid:"89293B38-F89B-4B10-A4C9-E3AA6EF876CB"}
 */
function onAction(event) {
	// TODO Auto-generated method stub
	elements.uigrid.setSelectedIndex(11)
}

/**
 * @override 
 * @protected 
 * @properties={typeid:24,uuid:"F0D934B0-3E56-474D-83B1-CC2874CCFFC2"}
 */
function getTableCount() {
	if (elements.uigrid.dataset) {
		/** @type {JSDataSet} */
		var ds = elements.uigrid.dataset;
		pageCount = ds.getMaxRowIndex();
		currentPage = pageCount;
	}
}
