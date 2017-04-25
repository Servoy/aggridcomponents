/**
 * @properties={typeid:24,uuid:"13AF26D0-B68C-4EE3-9EFA-2A932A70325C"}
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
	q.result.add(jSuppliers.columns.companyname, 'Supplier');
	q.result.add(jOrders.columns.orderdate.year, 'Year');
	q.result.add(jOrders.columns.orderdate.month, 'Month');
	q.result.add(q.columns.quantity);
	q.result.add(q.columns.unitprice);
	
	// filter on product
	q.where.add(jCustomers.columns.companyname.eq(foundset.companyname));
	
	var ds = databaseManager.getDataSetByQuery(q, -1);
	elements.uigrid.dataset = ds;
	defaultGrouping();
	//elements.uigrid.init(ds,['supplier', 'customer', 'productname'], ['year'], ['quantity']);
}

/**
 * @protected 
 * @properties={typeid:24,uuid:"7AF6E1CE-7EEB-4C47-8E70-561A37737252"}
 */
function defaultGrouping() {
	elements.uigrid.groupColumn(0);
	elements.uigrid.groupColumn(1);
}


/**
 * @override 
 * @protected 
 * @properties={typeid:24,uuid:"C5916A86-6D36-477F-B6B1-BFEFC88BBAD4"}
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
 * @properties={typeid:24,uuid:"349C7B42-848A-45BF-9FEB-D77A5221567C"}
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
 * @properties={typeid:24,uuid:"6F90C9C5-7B2A-4EA8-B883-E90F91D383B9"}
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
 * @properties={typeid:24,uuid:"9E576F21-8CF8-4503-9F3E-05C7D41AB30E"}
 */
function onAction(event) {
	// TODO Auto-generated method stub
	elements.uigrid.setSelectedIndex(11)
}
