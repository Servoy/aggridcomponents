/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"FC22AFE5-47B2-4C0C-AAAC-444C41952FFE"}
 */
var searchText;

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"CF3260E7-6238-4DE8-8964-4C6C6491BB39"}
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
 * @properties={typeid:24,uuid:"2D3C6B2D-DB00-4E97-815D-88BC15DFABDE"}
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
 * @properties={typeid:24,uuid:"AE4DC05B-779F-4430-89F4-946AF6F01885"}
 */
function onSearch(event) {
	search();
	getTableCount();
}

/**
 * @AllowToRunInFind
 * 
 *
 * @properties={typeid:24,uuid:"ED2CA569-4720-4A39-8E4E-D80E5BB51C44"}
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
 * @protected 
 * @override 
 *
 *
 * @properties={typeid:24,uuid:"DE1CE5A9-6E1B-4D75-82B4-4F6BE92434F2"}
 */
function onCellRightClick(foundsetindex,columnindex,record,event) {
	_super.onCellRightClick(foundsetindex,columnindex,record,event);
	if (foundsetindex == -1) {
		scopes.svyDataUtils.selectRecordByPks(foundset, record.orderid);
	} 
}


/**
 * Called when the mouse is clicked on a row/cell (foundset and column indexes are given) 
 *
 * @param {Number} foundsetindex
 * @param {Number} [columnindex]
 * @param {Object} [record]
 * @param {JSEvent} [event]
 *
 * @properties={typeid:24,uuid:"9F997B43-3BF2-4B23-B73C-5F91561D1234"}
 */
function onCellClick(foundsetindex, columnindex, record, event) {
	if (foundsetindex === -1) {
		
	} else {
		foundsetIndex = foundsetIndex;
	}

	var msg = 'Click ' + foundsetindex + ' - ' + columnindex + ' - ' + (record ? record.orderid : ' undefined ') + ' - ' + event.getElementName();
	logMsg(msg, 'Click');
}