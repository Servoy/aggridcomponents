/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"552115E9-2223-43FD-A8E0-7D37B4EECDB8"}
 */
var count = null;


/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"E08CD2EC-6B7A-4274-A0FA-130D907A3E9B"}
 */
function onAction(event) {
	foundset.find()
}

/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"7B2EAF05-FC71-4DDC-89F8-29D5C7DB440E"}
 * @AllowToRunInFind
 */
function onSearch(event) {
	foundset.search()
}

/**
 * @param {JSEvent} event
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"1129661A-2620-494E-B976-241B0293CF60"}
 */
function onSave(event) {
	databaseManager.saveData();
}
