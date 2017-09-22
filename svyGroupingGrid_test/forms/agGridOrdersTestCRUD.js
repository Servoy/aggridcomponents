/**
 * @protected 
 * @type {String}
 *
 * @properties={typeid:35,uuid:"7CA94E6F-2A96-4233-9287-9CF40BB05BC9"}
 */
var searchText = '';

/**
 * @protected 
 * @param firstShow
 * @param event
 *
 * @properties={typeid:24,uuid:"C32FED7B-B790-49C1-990A-0A7858B723EF"}
 */
function onShow(firstShow,event) {
	scopes.svyApplicationCore.addDataBroadcastListener(dataBroadcastEventListener, foundset.getDataSource());	
	scopes.svyApplicationCore.addDataBroadcastListener(dataBroadcastEventListener, foundset.orders_to_customers.getDataSource());	
	scopes.svyApplicationCore.addDataBroadcastListener(dataBroadcastEventListener, foundset.orders_to_employees.getDataSource());		
	_super.onShow(firstShow,event);
}

/**
 * @protected 
 * @param event
 *
 * @properties={typeid:24,uuid:"00FDF214-7BDB-4200-921A-BD39BCCB899E"}
 */
function onHide(event) {
	_super.onHide(event);
	scopes.svyApplicationCore.removeDataBroadcastListener(dataBroadcastEventListener, foundset.getDataSource());
	scopes.svyApplicationCore.removeDataBroadcastListener(dataBroadcastEventListener, foundset.orders_to_customers.getDataSource());
	scopes.svyApplicationCore.removeDataBroadcastListener(dataBroadcastEventListener, foundset.orders_to_employees.getDataSource());
}

/**
 * @param {String} dataSource
 * @param {Number} action
 * @param {JSDataSet} pks
 * @param {Boolean} cached
 * @protected 
 *
 * @properties={typeid:24,uuid:"CD6E6121-EF50-4DCB-8B06-60313DF47797"}
 */
function dataBroadcastEventListener(dataSource, action, pks, cached) {
	application.output('event listener ' + dataSource); 
	elements.groupingtable_1.notifyDataChange();
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"03E1A919-B354-407C-A818-E5530D96C024"}
 */
function onActionSort(event) {
	foundset.sort('shipcity asc');
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"7B27EA3B-1171-4E80-A2C2-8B781C075421"}
 */
function onNewRecord(event) {
	
	_super.onNewRecord(event);
	foundset.customerid = 'ALFKI';
	foundset.shipcity = foundset.orders_to_customers.city;
	foundset.shipcountry = foundset.orders_to_customers.country;
	foundset.shipaddress = foundset.orders_to_customers.address;
	foundset.shippostalcode = foundset.orders_to_customers.postalcode;
	foundset.shipname = foundset.orders_to_customers.contactname;
	foundset.orderdate = new Date();
	foundset.requireddate = scopes.svyDateUtils.addDays(new Date(),15);
}

/**
 * @param event
 * @protected 
 *
 * @properties={typeid:24,uuid:"D6A06647-2477-4BBE-9F2D-961FC0F3076D"}
 */
function onSearch(event) {
	search();
	getTableCount();
}

/**
 * @AllowToRunInFind
 * 
 *
 * @properties={typeid:24,uuid:"BE1019E4-DD18-49B0-BE4D-FC3E9970132F"}
 */
function search() {
	var fs = foundset.duplicateFoundSet();
	if (fs.find()) {
		fs.customerid = searchText;
		fs.search()
		foundset.loadRecords(fs);
	}
}

/**
 * @param foundsetindex
 * @param columnindex
 * @param record
 * @param event
 * 
 * @protected 
 * @override 
 *
 *
 * @properties={typeid:24,uuid:"E4084CFE-7A4D-4626-9A45-8E37C23A4EFF"}
 */
function onCellRightClick(foundsetindex,columnindex,record,event) {
	_super.onCellRightClick(foundsetindex,columnindex,record,event);
	if (foundsetindex == -1) {
		if(scopes.svyDataUtils.selectRecordByPks(foundset, record.orderid)) {
			foundsetIndex = foundset.getSelectedIndex();
		}
	} 
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"09820995-8F4A-4F27-BFA9-28A9B5DC7CAF"}
 */
function onEditRecord(event) {
	if (foundsetIndex && foundset.getRecord(foundsetIndex)) {
		var record = foundset.getRecord(foundsetIndex);
		var country = plugins.dialogs.showInputDialog("Country","Change country " + record.shipcountry + " for order " + record.orderid, "Bazar");
		application.output(country);
		record.shipcountry = country;
	} else {
		plugins.dialogs.showInfoDialog("Record not found","Could not find record at position " + foundsetIndex + ".\nPlease provide a valid index");
	}
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"107EF7EF-037D-44CF-A187-9A0875244464"}
 */
function onActionRefreshData(event) {
	elements.groupingtable_1.refreshData();
}
