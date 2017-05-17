/**
 * @override 
 * @protected 
 * @properties={typeid:24,uuid:"72272147-FCAD-4C37-9D95-DBD4A044BAB0"}
 */
function showUIGrid() {

	_super.showUIGrid();
	defaultGrouping();
}

/**
 * @protected 
 * @override 
 * @properties={typeid:24,uuid:"1CB1FF67-88A2-4D4D-B5A7-185602D3AF3F"}
 */
function getDataSet() {
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

	q.result.add(q.columns.orderid, 'Order');
	q.result.add(jProducts.columns.productname, 'Product');
	q.result.add(jSuppliers.columns.companyname, 'Supplier');
	q.result.add(jOrders.columns.orderdate.year, 'Year');
	q.result.add(jOrders.columns.orderdate.month, 'Month');
	q.result.add(q.columns.quantity);
	q.result.add(q.columns.unitprice);

	// filter on product
	q.where.add(jCustomers.columns.companyname.eq(foundset.companyname));

	var ds = databaseManager.getDataSetByQuery(q, -1);

	return ds;
}

/**
 * @protected
 * @properties={typeid:24,uuid:"4FA63163-FE9D-4B97-966C-2AF78F383968"}
 */
function defaultGrouping() {
	elements.uigrid.groupColumn(0);
	elements.uigrid.groupColumn(1);
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
 * @properties={typeid:24,uuid:"015A06CE-5053-416D-8A42-C6C285A775FC"}
 */
function onRowSelected(index, row, event) {
	// TODO Auto-generated method stub
	application.output(index)
	application.output(row)
	application.output(event.getElementName())
}

/**
 * Perform the element default action.
 * @param {Number} index
 * @param {String|Number} value
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"4F93B24B-80F9-40C9-B328-C12433C48A00"}
 */
function onProductClick(index, value, event) {
	// TODO Auto-generated method stub
	plugins.webnotificationsToastr.info('Product cliecked ' + value);
	forms.uigrid.navigateTo(forms.uigrid.MENU.PRODUCTS, [{dataProvider: "productname", operator: "=", value: value}]);
}

/**
 * Perform the element default action.
 *
 * @param {Number} index
 * @param {String|Number} value
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"3308FC06-0D9D-4B44-8F4E-1914599B76C5"}
 */
function onSupplierClick(index, value, event) {
	// TODO Auto-generated method stub
	
	plugins.webnotificationsToastr.info('Supplier cliecked ' + value);
	forms.uigrid.navigateTo(forms.uigrid.MENU.SUPPLIERS, [{dataProvider: "companyname", operator: "=", value: value}]);
	
}
