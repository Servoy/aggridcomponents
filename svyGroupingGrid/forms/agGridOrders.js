
/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"0C14D91A-F2DC-45FA-AE6D-D59164BF391A"}
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
 * @properties={typeid:24,uuid:"59B773C8-7A03-44AD-8A31-311B77E5F8E3"}
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
 * @properties={typeid:24,uuid:"4B1FE7BB-FDFA-4E9F-9F2B-A5F686418617"}
 */
function onDeleteRecord(event) {
	
	foundset.deleteRecord();
}