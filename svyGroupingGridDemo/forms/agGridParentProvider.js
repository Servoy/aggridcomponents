/**
 * @properties={typeid:24,uuid:"0F272A61-54B8-41FB-BD51-0073EFFF77F1"}
 */
function getParent() {
	return forms.gridSamples;
}

/**
 * @properties={typeid:24,uuid:"31110EE3-B2C5-4B01-B2E1-429D3CB062AB"}
 */
function allowFormIncludedInMenu() {
	return true;
}

/**
 *
 * @return {String}
 *
 * @properties={typeid:24,uuid:"DCC2E0EE-0E83-4DF5-8736-68D4C555658D"}
 */
function getName() {
	return "Grouping Grid";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"09D2BD81-458B-459F-91FC-1FC82AC39CBD"}
*/
function getDescription() {
	return "Table component with built-in grouping functionalities for large amount of data";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"729850D1-E56B-4A24-A3E8-D4BDDACAAACE"}
*/
function getIconStyleClass() {
	return "fa fa-list-alt"
}

/**
*
* @return {String} Website URL
*
* @properties={typeid:24,uuid:"0F91935A-09DF-4659-A30C-2E1FB2F8EC90"}
*/
function getWebSiteURL() {
	return 'https://github.com/Servoy/aggridcomponents';
}

/**
*
* @return {String} Additioanl info (wiki markdown supported)
*
* @properties={typeid:24,uuid:"2190BF69-7FFD-4EAC-A982-84CE61D99923"}
*/
function getMoreInfo() {
	var url = 'https://raw.githubusercontent.com/Servoy/aggridcomponents/master/README.md';
	return plugins.http.getPageData(url);
}

/**
*
* @return {String} Download URL
*
* @properties={typeid:24,uuid:"43ABB83D-0453-4E95-85B9-635E37E531AE"}
*/
function getDownloadURL() {
	return 'https://github.com/Servoy/aggridcomponents/releases/download/v1.0.2/svyGroupingGridDemo.servoy';
}