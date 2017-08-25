/**
 * @properties={typeid:24,uuid:"5F081BBC-9459-4A03-951F-CCF2634FF054"}
 */
function allowFormIncludedInMenu() {
	return true;
}

/**
 *
 * @return {String}
 *
 * @properties={typeid:24,uuid:"7749A1EE-DC14-4B12-8133-A2052AAC1F35"}
 */
function getName() {
	return "Customer's orders";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"3CC05D81-F428-492D-9E0E-6FD38B1F6A45"}
*/
function getDescription() {
	return "Group Customer's Orders";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"AF2EB0CA-4E38-4B58-93A1-7D1856DC499F"}
*/
function getIconStyleClass() {
	return "fa fa-list-alt"
}


/**
 * @properties={typeid:24,uuid:"47558331-7C62-4A3F-86DF-C950665FDDDB"}
 */
function getParent() {
	return forms.agGridParentProvider;
}