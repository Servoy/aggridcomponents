/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"5A51D0FD-7513-4A83-AADC-F5AE104A2E08"}
 */
var searchText = '';

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"BF85DB97-F7AF-4918-8478-E906C990A390"}
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
 * @properties={typeid:24,uuid:"41F8B075-6513-44B6-A7F0-26AF2E9EC96A"}
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
 * @properties={typeid:24,uuid:"86B380F0-4DE9-4FA3-8284-A09087A01170"}
 */
function onSearch(event) {
	search();
	getTableCount();
}

/**
 * @AllowToRunInFind
 * 
 *
 * @properties={typeid:24,uuid:"5A01C22C-4794-4706-94B2-DA7A351DBF9B"}
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
 * @properties={typeid:24,uuid:"1D41EDB1-85E9-4217-8626-60877BC1EDCC"}
 */
function onCellRightClick(foundsetindex,columnindex,record,event) {
	_super.onCellRightClick(foundsetindex,columnindex,record,event);
	if (foundsetindex == -1) {
		scopes.svyDataUtils.selectRecordByPks(foundset, record.orderid);
	} 
}
