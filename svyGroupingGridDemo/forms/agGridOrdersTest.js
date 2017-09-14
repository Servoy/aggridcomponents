/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"E77DD074-56D6-445F-B3F1-E93E3345E0DD"}
 */
var searchText = '';

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
 * @param foundsetindex
 * @param columnindex
 * @param record
 * @param event
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
		scopes.svyDataUtils.selectRecordByPks(foundset, record.orderid);
	} 
}
