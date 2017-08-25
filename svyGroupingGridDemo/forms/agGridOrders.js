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
