/**
 * @protected 
 * @type {String}
 *
 * @properties={typeid:35,uuid:"E77DD074-56D6-445F-B3F1-E93E3345E0DD"}
 */
var searchText = '';

/**
 * @protected 
 * @param firstShow
 * @param event
 *
 * @properties={typeid:24,uuid:"2D9E2CB1-9B3B-49C2-84BB-475A2A2B785A"}
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
 * @properties={typeid:24,uuid:"6789DD6E-F4CB-4E78-95C3-806BE2E82E0B"}
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
 * @properties={typeid:24,uuid:"C6BF543F-A681-48F7-85AE-74DF48060C03"}
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
 * @properties={typeid:24,uuid:"65F419EE-16B8-4460-B4E4-D033296D8B89"}
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
 * @properties={typeid:24,uuid:"6BAF5523-DAD2-4CB0-ACEF-863ABF9DCFA5"}
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
 * @properties={typeid:24,uuid:"4145A35E-6BC4-4B9C-931A-D7C1CB73FEAC"}
 */
function onSearch(event) {
	search();
	getTableCount();
}

/**
 * @AllowToRunInFind
 * 
 *
 * @properties={typeid:24,uuid:"95B37893-EBEF-44B4-801C-3F3D80676169"}
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
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {Object} [record]
 * @param {JSEvent} [event]
 *
 * @properties={typeid:24,uuid:"F079E5FC-F6D4-454F-8055-BFBEEB1389B1"}
 */
function onCellClick(foundsetindex, columnindex, record, event) {
	if (foundsetindex === -1) {
		
	} else {
		foundsetIndex = foundsetIndex;
	}

	var msg = 'Click ' + foundsetindex + ' - ' + columnindex + ' - ' + (record ? record.orderid : ' undefined ') + ' - ' + event.getElementName();
	logMsg(msg, 'Click');
}

/**
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {Object} [record]
 * @param {JSEvent} [event]
 * 
 * @protected 
 * @override 
 *
 *
 * @properties={typeid:24,uuid:"1A7415F4-1807-4E3B-BBF0-A9DC4E0BAAA1"}
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
 * @properties={typeid:24,uuid:"E8F53DC5-C7AD-45BE-895C-36959E64E22D"}
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
 * @properties={typeid:24,uuid:"88EF93CA-B4CA-44E2-9D88-DF4830139325"}
 */
function onActionRefreshData(event) {
	elements.groupingtable_1.refreshData();
}
