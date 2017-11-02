/**
 * @properties={typeid:24,uuid:"63C4766A-2E45-490F-8829-96E0A7FDE1C1"}
 */
function allowFormIncludedInMenu() {
	return true;
}

/**
 *
 * @return {String}
 *
 * @properties={typeid:24,uuid:"92F8F7A2-C7B9-4BAC-AFEC-C11EECFDC9EB"}
 */
function getName() {
	return "Netherland's postal codes";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"71BCC1C1-C1E7-4AEC-B0B4-7A84D05FF494"}
*/
function getDescription() {
	return "Example of table with grouped data on Netherland's postal codes";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"3D92F617-A5D8-47C1-8D36-C447DA8B2D84"}
*/
function getIconStyleClass() {
	return "fa fa-list-alt"
}

/**
 * @properties={typeid:24,uuid:"C64D4316-AB4B-443E-8221-ABCB6D0B5182"}
 */
function getParent() {
	return forms.agGridParentProvider;
}

/**
*
* @return {String} Website URL
*
* @properties={typeid:24,uuid:"4A4DF41E-617B-4C6E-9C6F-FAD6A0244D3C"}
*/
function getWebSiteURL() {
	return 'https://github.com/Servoy/aggridcomponents';
}

/**
*
* @return {String} Additioanl info (wiki markdown supported)
*
* @properties={typeid:24,uuid:"F1B24C07-5720-4AA8-A740-DDCF686F6D04"}
*/
function getMoreInfo() {
	var url = 'https://raw.githubusercontent.com/Servoy/aggridcomponents/master/README.md';
	return plugins.http.getPageData(url);
}

/**
*
* @return {String} Download URL
*
* @properties={typeid:24,uuid:"A959AD36-F0D2-4FAB-A150-4C9DB0CCF8EB"}
*/
function getDownloadURL() {
	return 'https://github.com/Servoy/aggridcomponents/releases/download/v1.0.2/svyGroupingGridDemo.servoy';
}