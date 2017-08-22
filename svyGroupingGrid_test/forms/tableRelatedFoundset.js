/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"1B542AD8-88C0-4559-A207-BF72B74A5D32",variableType:4}
 */
var selectedIndex = 1;

/**
 * 
 * @type {Boolean}
 * @properties={typeid:35,uuid:"5A73D8CF-FA5E-4603-A293-03CFC7CD6C87",variableType:-4}
 */
var onTop = true;
/**
 * @type {Boolean}
 * @properties={typeid:35,uuid:"68F30B6B-808D-4948-A218-4E443D5D094C",variableType:-4}
 */
var changeSelection = true;


/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"094E757D-546E-476E-B8A6-22B3552588E8"}
 */
function onNewRecord(event) {
	var idx = foundset.newRecord(onTop, changeSelection);
	var record = foundset.getRecord(idx);
	record.orderid = 10248;
	record.productid = 42;
	//record.productid = Math.floor((Math.random()*10) + 1);
}

/**
 * @param event
 *
 * @properties={typeid:24,uuid:"5F665923-9546-48EE-848F-936F540ACD7E"}
 */
function onNewRecordIndexed(event) {
	var idx  = foundset.newRecord(selectedIndex, changeSelection);
	var record = foundset.getRecord(idx);
	record.orderid = 10248;
	record.productid = 11;
	//record.productid = Math.floor((Math.random()*10) + 1);
}

/**
 * TODO generated, please specify type and doc for the params
 * @param event
 *
 * @properties={typeid:24,uuid:"4BD79952-1741-4036-A6E7-528F4B6E7669"}
 */
function onDeleteRecord(event) {
	foundset.deleteRecord(selectedIndex);
}

/**
 * Handle record selected.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"437A7059-8909-443E-9099-CA9265B6069F"}
 */
function onRecordSelection(event) {
	selectedIndex = foundset.getSelectedIndex();
}
