

/**
 * @properties={typeid:24,uuid:"6DF382F5-E249-46FF-A430-F19FE114CD75"}
 */
function populateCountryList( ) {
	
	var capitals = [];
	var countries = [];
	var regions = [];
	
	
	var fs = datasources.db.postalcode.countries.getFoundSet();
	
	var data = getCountriesApi();
	application.output('Length ' + data.length)
	for (var i = 0; i < data.length; i++) {
		
		var country = data[i];
		
		fs.newRecord()
		fs.capital = country.capital;
		fs.country = country.name;
		fs.region = country.region;
		fs.subregion = country.subregion;
		
		
		if (i%600 === 0) {
			application.output('save ' +  databaseManager.saveData() + ' i ' + i );
			fs.clear();
		}
	}
	
}

/**
 * @properties={typeid:24,uuid:"877EC3C2-05C7-4890-A5DC-D4BD55EA128E"}
 */
function randomizeOrdersCountry() {
	
	var fs = datasources.db.postalcode.countries.getFoundSet();
	fs.loadAllRecords();
	fs.getRecord(210);
	
	
	var orders = datasources.db.example_data.orders.getFoundSet();
	orders.loadAllRecords()
	
	databaseManager.setAutoSave(false)
	for (var i = 1; i <= orders.getSize(); i++) {
		var record = orders.getRecord(i);
		
		var x = Math.random()*1000;
		var index = Math.round(x/3);
		
		var country = fs.getRecord(index);
		if (country) {
			record.shipcountry = country.country;
			record.shipcity = country.capital;
			record.shipregion = country.subregion;
			application.output(i + ' ' + country.country)
		}
		
		
		if (i%600 === 0) {
			application.output('save ' +  databaseManager.saveData() + ' i ' + i );
		}
		
	}
	
	databaseManager.setAutoSave(true)
	databaseManager.saveData()

	
}

/**
 * @properties={typeid:24,uuid:"53B4311D-BC36-4BB1-B107-5D14651AAEB1"}
 */
function getCountriesApi() {
	var client = plugins.http.createNewHttpClient();
	var request = client.createGetRequest('http://restcountries.eu/rest/v2/all');
	var response = request.executeRequest();
	var httpCode = response.getStatusCode(); // httpCode 200 is ok"
	if (httpCode == 200) {
		var content = response.getResponseBody();
		application.output(content);
		return JSON.parse(content);
	}
	return [];
}