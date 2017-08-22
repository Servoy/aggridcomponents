/**
 * @type {String}
 * @protected 
 *
 * @properties={typeid:35,uuid:"E5250EC1-AEC6-41C7-B714-EEA32DDCE2F7"}
 */
var searchText;


/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"DDA42EFF-6FD7-482F-AD9E-D5FFBEE15D01"}
 */
function onSortCustomerID(event) {
	foundset.sort('customerid asc');
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"0F94D212-EF45-4B6C-BCB9-E673C6B61C35"}
 */
function onNewRecord(event) {
	
	foundset.newRecord();
	foundset.customerid = 'ALFKI';
	foundset.shipcity = 'Thessaloniki';
	foundset.orderdate = new Date();
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"8AFA17BD-B876-4BC0-918D-A59F958909CF"}
 */
function onDeleteRecord(event) {
	
	foundset.deleteRecord();
}


/**
 * @param event
 * @protected 
 *
 * @properties={typeid:24,uuid:"33EC5393-52A1-4606-8636-BDD68DA0F912"}
 */
function onSearch(event) {
	search();
}

/**
 * @AllowToRunInFind
 * 
 *
 * @properties={typeid:24,uuid:"B5E2E264-8BE3-4557-864E-9AB1F67E9A6F"}
 */
function search() {
	var fs = foundset.duplicateFoundSet();
	if (fs.find()) {
		fs.customerid = searchText;
		fs.search()
		foundset.loadRecords(fs);
	}
}