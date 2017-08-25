/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"8AFA8ABE-BFD7-4457-B66A-D532C6C0D924"}
 */
var searchText = '';

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"A438A521-7605-4F12-964C-C851B3F3CB3D"}
 */
function onActionSort(event) {
	foundset.sort('code asc');
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"199535DA-744B-483A-9983-96E582104363"}
 */
function onNewRecord(event) {
	
	//foundset.newRecord();
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"C47C5F4B-1736-41B6-B013-9FEB3D755A76"}
 */
function onDeleteRecord(event) {
	
//	foundset.deleteRecord();
}

/**
 * @param event
 * @protected 
 *
 * @properties={typeid:24,uuid:"ECC9BD75-8C18-4F9B-91A0-0E48F14A024C"}
 */
function onSearch(event) {
	search();
}

/**
 * @AllowToRunInFind
 * 
 *
 * @properties={typeid:24,uuid:"F46805C7-0237-4391-A297-5C8DCE6FF689"}
 */
function search() {
	var fs = foundset.duplicateFoundSet();
	if (fs.find()) {
		fs.city = searchText;
		fs.search()
		foundset.loadRecords(fs);
	}
}
