/**
 * @param event
 *
 * @properties={typeid:24,uuid:"EE838223-200C-4EF6-B8E7-EE7897708224"}
 */
function onLoad(event) {
	
	// apply a filter to it
	foundset.addFoundSetFilterParam("orderid",">",40000);
	
	_super.onLoad(event);
		
	datasetManager.addResult('order_details_to_products.productname','Product');
	datasetManager.addResult('order_details_to_products.products_to_suppliers.companyname', 'Supplier');
	datasetManager.addResult('order_details_to_orders.orders_to_customers.companyname','Customer');
	datasetManager.addResult('order_details_to_orders.orderdate','Year', orderDateToYear);
	datasetManager.addResult('order_details_to_orders.orderdate','Month', orderDateToMonth);
	datasetManager.addResult('quantity', 'quantity');
	datasetManager.addResult('unitprice', 'unitprice');
	
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
 * @properties={typeid:24,uuid:"75F71812-57DF-49B3-B11E-E838F1CE157B"}
 */
function onProductClick(index, value, event) {
	plugins.webnotificationsToastr.info('Product cliecked ' + value);
	forms.pagingGridMain.navigateTo(forms.pagingGridMain.MENU.PRODUCTS, [{dataProvider: "productname", operator: "=", value: value}]);
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
	plugins.webnotificationsToastr.info('Supplier cliecked ' + value);
	forms.pagingGridMain.navigateTo(forms.pagingGridMain.MENU.SUPPLIERS, [{dataProvider: "companyname", operator: "=", value: value}]);
	
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
	forms.pagingGridMain.navigateTo(forms.pagingGridMain.MENU.CUSTOMERS, [{dataProvider: "companyname", operator: "LIKE", value: value}]);
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
	var lookupSet = datasetManager.lookupValue(columnIndex, value);
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
	var groupSet = datasetManager.groupValue(columnIndex, groupIndex);
	elements.uigrid.dataset = groupSet;
}
