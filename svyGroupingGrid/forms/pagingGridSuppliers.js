/**
 * @param {JSEvent} event
 *
 * @properties={typeid:24,uuid:"A03A8146-B78E-4606-8335-36A059FCF131"}
 */
function onLoad(event) {
	
	_super.onLoad(event);
}


/**
 * @properties={typeid:24,uuid:"2A5540FF-A63A-483C-A4A5-239B60FE946E"}
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
 * @properties={typeid:24,uuid:"25B78874-6416-48D6-83F7-FF800DB812D7"}
 */
function defaultGrouping() {
	elements.uigrid.groupColumn(0);
	elements.uigrid.groupColumn(1);
	elements.uigrid.groupColumn(2);
}

/**
 * @override 
 * @protected 
 * @properties={typeid:24,uuid:"04D3F332-3757-4A51-BB45-00B38CB8EA18"}
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
 * @properties={typeid:24,uuid:"5A41487C-DFAB-45AC-94C6-947249C11A32"}
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
 * @properties={typeid:24,uuid:"7953B8DA-3151-43C6-8726-30A2DE0B9239"}
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
 * @properties={typeid:24,uuid:"0BB2F1BC-B551-44FA-8AAA-0971F910E0F5"}
 */
function onAction(event) {
	// TODO Auto-generated method stub
	elements.uigrid.setSelectedIndex(11)
}
