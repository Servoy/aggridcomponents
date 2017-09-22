/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"C46F5822-2D98-480C-86D2-CC90ACE9B79D"}
 */
var searchText = '';

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"8DE618F6-38BC-488F-AB59-17DB7319E50B"}
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
 * @properties={typeid:24,uuid:"28506B07-B79A-46FF-9ABF-ADA1CA0D86D0"}
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
 * @properties={typeid:24,uuid:"819B3D89-894E-4626-BFBF-CB4580495B35"}
 */
function onSearch(event) {
	search();
	getTableCount();
}

/**
 * @AllowToRunInFind
 * 
 *
 * @properties={typeid:24,uuid:"95596456-77BF-4890-8DED-C58889DEE999"}
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
 * @properties={typeid:24,uuid:"8F9C1E04-94DF-4A81-A262-C21F11828426"}
 */
function onCellRightClick(foundsetindex,columnindex,record,event) {
	_super.onCellRightClick(foundsetindex,columnindex,record,event);
	if (foundsetindex == -1) {
		scopes.svyDataUtils.selectRecordByPks(foundset, record.orderid);
	} 
}
