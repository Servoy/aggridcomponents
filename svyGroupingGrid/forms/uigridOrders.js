/**
 * @param event
 *
 * @properties={typeid:24,uuid:"DB9118F7-3ED3-490D-AD3E-F4FD0C878F2C"}
 */
function onLoad(event) {
	pageSize = 10;
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
 * @param {Number} tableOffset
 * 
 * @properties={typeid:24,uuid:"C0A5B052-BA85-4036-BDFC-D951EE9F3F37"}
 */
function getDataSet(tableOffset) {	
	datasetManager = new scopes.svyDataset.DataSetManager(foundset.getDataSource());

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
	
	addOffset(datasetManager.query, tableOffset);
	
	//application.output(databaseManager.getSQL(q));
	//application.output(databaseManager.getSQLParameters(q));
	
	// TODO set columns Dinamically
	var ds = datasetManager.getDataSet(pageSize); //databaseManager.getDataSetByQuery(q, pageSize);	
	return ds;
}

/**
 * @properties={typeid:24,uuid:"817847A2-00F7-49EC-AE55-E25EC5AB46FE"}
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
 * @properties={typeid:24,uuid:"385D086F-6038-4A74-92DE-93C79D5AA2AC"}
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
 * @properties={typeid:24,uuid:"09D791FB-E5D7-40A2-886F-ED4CC15A2F7D"}
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
 * @properties={typeid:24,uuid:"D0B0D9DC-16F2-4018-B3AF-46FEBEF17754"}
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
 * @properties={typeid:24,uuid:"414E345A-2ACC-4EAC-A3D0-FD124CEDB0EF"}
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
 * @properties={typeid:24,uuid:"5838C76C-8DBE-4661-9071-F5D237B5B2DB"}
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
 * @properties={typeid:24,uuid:"C6D6DF06-A90D-44AE-878C-36F80FD8066A"}
 */
function onNodeExpanded(columnIndex, value) {
	// FIXME better lookup pattern
	var dataset = datasetManager.getDataSet(pageSize);
	
	var column = datasetManager.query.result.getColumns()[columnIndex];
	var lookupSet = datasetManager.lookupValue(column, value);

	/** 
	 * @type {JSDataSet}
	 * */
	var result = elements.uigrid.dataset;
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
 * @properties={typeid:24,uuid:"93C80F7A-DA0E-4E06-A49F-88763A4538CB"}
 */
function onGroupChanged(columnIndex, groupIndex, isGrouped) {
	application.output(groupIndex);
	// FIXME better lookup pattern
	var dataset = datasetManager.getDataSet(pageSize);
	
	var column = datasetManager.query.result.getColumns()[columnIndex];
	var groupSet;
//	if (groupIndex == 0) {	// has groupIndex
		groupSet = datasetManager.groupValue(column,groupIndex);
//	} else if (isNaN(groupIndex)) {		// grouping cleared
		
//	} else {	// is a group of priority > 0
		
//	}
	elements.uigrid.dataset = datasetManager.getDataSet(pageSize);
	
}
