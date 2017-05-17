/**
 * @param event
 *
 * @properties={typeid:24,uuid:"EE838223-200C-4EF6-B8E7-EE7897708224"}
 */
function onLoad(event) {
	
	foundset.addFoundSetFilterParam("orderid",">",40000);
	
	pageSize = 10;
	_super.onLoad(event);
		
	datasetManager.addResult('order_details_to_products.productname','Product');
	datasetManager.addResult('order_details_to_products.products_to_suppliers.companyname', 'Supplier');
	datasetManager.addResult('order_details_to_orders.orders_to_customers.companyname','Customer');
	datasetManager.addResult('order_details_to_orders.orderdate','Year', orderDateToYear);
	datasetManager.addResult('order_details_to_orders.orderdate','Month', orderDateToMonth);
	datasetManager.addResult('quantity', 'quantity');
	datasetManager.addResult('unitprice', 'unitprice');
	
	// TODO addPK in dataset
	//datasetManager.addResult('orderid', 'orderid');
	//datasetManager.addResult('productid', 'productid');
	
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
}

/**
 * @param {Number} tableOffset
 * 
 * @properties={typeid:24,uuid:"09AA6633-1792-4BC1-BFF6-6F5F85FC5E24"}
 */
function getDataSet(tableOffset) {	
//	datasetManager = new scopes.svyDataset.DataSetManager(foundset.getQuery());
//
//	datasetManager.addResult('order_details_to_products.productname','Product');
//	datasetManager.addResult('order_details_to_products.products_to_suppliers.companyname', 'Supplier');
//	datasetManager.addResult('order_details_to_orders.orders_to_customers.companyname','Customer');
//	datasetManager.addResult('order_details_to_orders.orderdate','Year', orderDateToYear);
//	datasetManager.addResult('order_details_to_orders.orderdate','Month', orderDateToMonth);
//	datasetManager.addResult('quantity', 'quantity');
//	datasetManager.addResult('unitprice', 'unitprice');
//	
//	/** 
//	 * @param {QBColumn} column 
//	 * @return {QBColumn}
//	 * */
//	function orderDateToYear(column) {
//		return column.year;
//	}
//	
//	/** 
//	 * @param {QBColumn} column 
//	 * @return {QBColumn}
//	 * */
//	function orderDateToMonth(column) {
//		return column.month;
//	}
	
//	datasetManager.addOffset(tableOffset);
	
	//application.output(databaseManager.getSQL(q));
	//application.output(databaseManager.getSQLParameters(q));
	
	// TODO set columns Dinamically
	var ds = datasetManager.getDataSet(pageSize); //databaseManager.getDataSetByQuery(q, pageSize);	
	return ds;
}

/**
 * @properties={typeid:24,uuid:"2DDF2F00-8B42-4DBF-9721-B29686721AA3"}
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
 * @properties={typeid:24,uuid:"CE5AE2AD-E3F6-4AD2-9471-48083698BF5C"}
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
 * @properties={typeid:24,uuid:"6082235B-9A3D-443C-80CF-BBD6A30EE28E"}
 */
function onAction(event) {
	elements.uigrid.setSelectedIndex(11);
}

/**
 * Perform the element default action.
 * @param {Number} index
 * @param {String|Number} value
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"75F71812-57DF-49B3-B11E-E838F1CE157B"}
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
 * @properties={typeid:24,uuid:"4E23AEB0-8BA4-4D57-99AE-772DDC694BAA"}
 */
function onSupplierClick(index, value, event) {
	// TODO Auto-generated method stub
	
	plugins.webnotificationsToastr.info('Supplier cliecked ' + value);
	forms.uigrid.navigateTo(forms.uigrid.MENU.SUPPLIERS, [{dataProvider: "companyname", operator: "=", value: value}]);
	
}

/**
 * @param {Number} index
 * @param {String|Number} value
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 * 
 * @properties={typeid:24,uuid:"CE71664C-19B1-423B-AAFF-02773C7AAAF3"}
 */
function onCustomerClick(index, value, event) {
	
	plugins.webnotificationsToastr.info('Customer clicked ' + value);
	forms.uigrid.navigateTo(forms.uigrid.MENU.CUSTOMERS, [{dataProvider: "companyname", operator: "LIKE", value: value}]);
}

/**
 * @param {Number} columnIndex
 * @param {string} value
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"F913D2D2-442D-4B43-A9B2-1EE6E5D17A23"}
 */
function onNodeExpanded(columnIndex, value) {
	// FIXME better lookup pattern
	var dataset = datasetManager.getDataSet(pageSize);
	
	// TODO better way to get the column 
	var lookupSet = datasetManager.lookupValue(columnIndex, value);

	for (var i = 1; i <= dataset.getMaxRowIndex(); i++) {
		var row = dataset.getRowAsArray(i);
		lookupSet.addRow(row)
	}
	elements.uigrid.dataset = lookupSet;
}

/**
 * @param {Number} columnIndex
 * @param {Number} groupIndex
 * @param {Boolean} isGrouped
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"332C65A1-A530-45A0-85F9-C80489932E42"}
 */
function onGroupChanged(columnIndex, groupIndex, isGrouped) {
	application.output(groupIndex);
	// FIXME better lookup pattern
	// var dataset = datasetManager.getDataSet(pageSize);
	
//	var column = datasetManager.query.result.getColumns()[columnIndex];
	var groupSet;
//	if (groupIndex == 0) {	// has groupIndex
		groupSet = datasetManager.groupValue(columnIndex, groupIndex);
//	} else if (isNaN(groupIndex)) {		// grouping cleared
		
//	} else {	// is a group of priority > 0
		
//	}
	elements.uigrid.dataset = groupSet //datasetManager.getDataSet(pageSize);
	
}
