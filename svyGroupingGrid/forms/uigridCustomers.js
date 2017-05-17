/**
 * @override 
 * @protected 
 * @properties={typeid:24,uuid:"13AF26D0-B68C-4EE3-9EFA-2A932A70325C"}
 */
function showUIGrid() {

	_super.showUIGrid();
	defaultGrouping();
}

/**
 * @protected 
 * @override 
 * @properties={typeid:24,uuid:"A7D55444-0E62-494A-AA9B-0C7AE02EDDDC"}
 */
function getDataSet() {
	var q = datasources.db.example_data.customers.createSelect();

	q.result.add(q.columns.customerid, 'Customer');
	q.result.add(q.columns.companyname, 'Companyname');
	q.result.add(q.columns.country, 'Country');
	q.result.add(q.columns.city, 'City');

	var ds = databaseManager.getDataSetByQuery(q, -1);
	return ds;
}

/**
 * @protected
 * @properties={typeid:24,uuid:"7AF6E1CE-7EEB-4C47-8E70-561A37737252"}
 */
function defaultGrouping() {
//	elements.uigrid.groupColumn(0);
//	elements.uigrid.groupColumn(1);
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
 * @param {Number} index
 * @param {String|Number} value
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 * 
 * @properties={typeid:24,uuid:"AFAED7C0-724D-4512-B9A8-30DFF059021A"}
 */
function onCustomerClick(index, value, event) {
	
	plugins.webnotificationsToastr.info('Customer clicked ' + value);
	forms.uigrid.navigateTo(forms.uigrid.MENU.CUSTOMER_ORDERS, [{dataProvider: "customerid", operator: "LIKE", value: value}]);
}
