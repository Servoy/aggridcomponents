'use strict';
var protractor = require('protractor');
var proc = require('process');
var { defineSupportCode } = require(proc.cwd() + '/lib/cucumberLoader').load();
var EC = protractor.ExpectedConditions;
var element = browser.element;
var expect = require('expect');
var startDate = new Date();
var tempDate;
var startBlockDate = new Date();
var tempBlockDate;
var hasErrorDuringSuite = false;
var userAnalytics = require('universal-analytics');
var analytics = userAnalytics('UA-93980847-1');
var find = require('find');
var fs = require('fs-extra');
var timeoutAgAction = 60 * 1000;

defineSupportCode(({ Given, Then, When, Before, After }) => {
	//BASIC NAGIVATION
	Given('I go to {url}', { timeout: 60 * 1000 }, function (url) {
		return browser.get(url);
	});
	//END BASIC NAVIGATION

	//ENVIRONMENT SETUP
	Given('I setup the environment', { timeout: 30 * 1000 }, function (callback) {
		createDirIfNotExists(browser.params.htmlDirectory);
		createDirIfNotExists(browser.params.screenshotDirectory);
		removeHtmlReports(browser.params.htmlDirectory); //remove html reports from previous tests
		removeScreenshots(browser.params.screenshotDirectory);
		wrapUp(callback, 'setupEnvironment');
	});
	//END ENVORONMENT SETUP

	//SERVOY SIDENAV COMPONENT
	When('servoy sidenav component with name {elementName} tab {tabName} is clicked', { timeout: 10 * 1000 }, function (elementName, tabName, callback) {
		var menuItems = element.all(by.xpath("//data-servoyextra-sidenav[@data-svy-name='" + elementName + "']"));
		menuItems.each(function (menuItem) {
			clickElement(menuItem.element(by.cssContainingText('a', tabName))).then(function () {
				wrapUp(callback, "Click event");
			})
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});
	//END SERVOY SIDENAV COMPONENT

	//SERVOY CALENDAR COMPONENT
	When('servoy calendar component with name {month} is clicked', { timeout: 60 * 1000 }, function (elementName, callback) {
		clickElement(element(by.xpath("//data-servoydefault-calendar[@data-svy-name='" + elementName + "']/div/span[1]"))).then(function () {
			wrapUp(callback, "Click event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});

	When('servoy calendar component is clicked untill I reach month {month} in year {year}', { timeout: 120 * 1000 }, function (month, year, callback) {
		var monthTo = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(month.toLowerCase()) + 1;
		var yearFrom = new Date().getFullYear();
		var monthFrom = new Date().getMonth() + 1;
		var yearTo = year;
		var differenceInMonths;

		if (yearFrom > yearTo) { //calendar year is in the future
			differenceInMonths = (yearFrom - yearTo) * 12;//selected calendar date to is in the past

			if (monthTo > monthFrom) {
				differenceInMonths -= (monthTo - monthFrom);
			}
			else if (monthFrom > monthTo) {
				differenceInMonths += (monthFrom - monthTo);
			}
			for (var x = 0; x < differenceInMonths; x++) {
				clickElement(element.all(by.css('.prev')).first());
			}
		} else if (yearFrom < yearTo) { //calendar year is in the past
			differenceInMonths = (yearTo - yearFrom) * 12;//selected calendar date to is in the future

			if (monthTo > monthFrom) {
				differenceInMonths += (monthTo - monthFrom);
			}
			else if (monthFrom > monthTo) {
				differenceInMonths -= (monthFrom - monthTo);
			}
			console.log('Clicks after month: ' + differenceInMonths);

			for (var x = 0; x < differenceInMonths; x++) {
				clickElement(element.all(by.css('.next')).first());
			}
		} else { //calendar data and current year are the same
			if (monthTo > monthFrom) {
				differenceInMonths = (monthTo - monthFrom);
				console.log('Clicks after month: ' + differenceInMonths);

				for (var x = 0; x < differenceInMonths; x++) {
					clickElement(element.all(by.css('.next')).first());
				}
			}
			else if (monthFrom > monthTo) {
				differenceInMonths = (monthFrom - monthTo);
				console.log('Clicks after month: ' + differenceInMonths);

				for (var x = 0; x < differenceInMonths; x++) {
					clickElement(element.all(by.css('.prev')).first());
				}
			}
		}
		browser.controlFlow().execute(callback);
		//wrapUp(callback, "Calendar event");
	});

	When('servoy calendar component day {day} is clicked', { timeout: 15 * 1000 }, function (day, callback) {
		browser.wait(EC.presenceOf(element(by.cssContainingText("td", day)))).then(function () {
			browser.wait(EC.elementToBeClickable(element(by.cssContainingText("td", day)))).then(function () {
				clickElement(element(by.cssContainingText("td.day", day))).then(function () {
					wrapUp(callback, "Click event");
				});
			});
		}).catch(function (error) {
			console.log('error.message');
			tierdown(true);
		})
	});
	//END SERVOY CALENDAR COMPONENT

	//SERVOY SELECT2TOKENIZER COMPONENT
	When('servoy select2tokenizer component with name {elementName} is clicked', { timeout: 60 * 1000 }, function (elementName, callback) {
		clickElement(element(by.xpath("//data-servoyextra-select2tokenizer[@data-svy-name='" + elementName + "']/div/span/span/span/ul/li/input"))).then(function () {
			wrapUp(callback, "Click event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});

	When('servoy select2tokenizer component with class name {elementClass} record number {rowNumber} is clicked', { timeout: 60 * 1000 }, function (elementClass, recordNumber, callback) {
		element.all(by.xpath("//ul[@class='" + elementClass + "']")).each(function (childElement) {
			return clickElement(childElement.all(by.css('li')).get(recordNumber - 1));
		}).then(function () {
			wrapUp(callback, "Click event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});

	//cheat manier. De typeahead zoekt records gebaseerd op input, de stap is hier te snel voor dus is er een pause van 2 seconden
	Then('servoy select2tokenizer component with class name {elementClass} record number {rowNumber} equals {recordText}', { timeout: 60 * 1000 }, function (elementClass, recordNumber, text, callback) {
		browser.sleep(2000).then(function () {
			element.all(by.xpath("//ul[@class='" + elementClass + "']")).each(function (childElement) {
				childElement.all(by.css('li')).get(recordNumber - 1).getText().then(function (textToCompare) {
					validate(textToCompare.toLowerCase(), text.toLowerCase());
				});
			}).then(function () {
				wrapUp(callback, "Click event");
			}).catch(function (error) {
				console.log(error.message);
				tierdown(true);
			});
		});
	});

	When('servoy select2tokenizer component with name {elementName} the text {recordText} is inserted', { timeout: 60 * 1000 }, function (elementName, text, callback) {
		var elem = element(by.xpath("//data-servoyextra-select2tokenizer[@data-svy-name='" + elementName + "']/div/span/span/span/ul/li/input"));
		sendKeys(elem, text).then(function () {
			wrapUp(callback, "Click event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});
	//END SERVOY SELECT2TOKENIZER COMPONENT

	//BROWSER ACTION
	When('I press {browserAction}', { timeout: 60 * 1000 }, function (browserAction, callback) {
		browserAction = browserAction.toLowerCase();
		switch (browserAction) {
			case "enter":
				browser.actions().sendKeys(protractor.Key.RETURN).perform().then(function () {
					wrapUp(callback, "Browser action event");
				}).catch(function (error) {
					console.log(error.message);
					tierdown(true);
				});
				break;
			case "tab":
				browser.actions().sendKeys(protractor.Key.TAB).perform().then(function () {
					wrapUp(callback, "Browser action event");
				}).catch(function (error) {
					console.log(error.message);
					tierdown(true);
				});
				break;
			default:
				console.log("Unknown browser action");
				tierdown(true);
		}
	});
	//END BROWSER ACTION

	//SERVOY TABLE COMPONENT
	When('servoy table component with name {elementName} I scroll to the record with {string} as text', { timeout: 60 * 1000 }, function (elementName, recordText, callback) {
		findRecordTableComponent(elementName, recordText, callback);
	});
	//END SERVOY TABLE COMPONENT

	//SERVOY EXTRA TABLE COMPONENT
	When('servoy extra table component with name {elementName} I scroll to the record with {string} as text', { timeout: 60 * 1000 }, function (elementName, recordText, callback) {
		findRecordTableExtraComponent(elementName, recordText, callback);
	});

	When('servoy extra table component with name {elementName} I want to measure the time it takes to render the cell with text {string}', { timeout: 60 * 1000 }, function (elementName, recordText, callback) {
		var elem = element.all(by.xpath("//*[@data-svy-name='" + elementName + "']"));
		browser.wait(EC.presenceOf(elem).call(), 30000, 'Element not visible').then(function(){
			var elemCell = elem.all(by.xpath("//div[text()='"+ recordText +"']"))
			browser.wait(EC.presenceOf(elemCell).call(), 30000, 'Element not visible').then(function(){
				wrapUp(callback, "render extra table");
			});
		});
	});

	//END SERVOY EXTRA TABLE COMPONENT

	//SERVOY AGENDA COMPONENT
	When('servoy agenda component with name {elementName} I want to see my appointments on {day} {month} {year}', { timeout: 60 * 1000 }, function (elementName, day, month, year, callback) {
		clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[8]"))).then(function () {
			clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[11]"))).then(function () {
				return navigateCalendar(elementName, month, year);
			}).then(function (done) {
				if (done) {
					wrapUp(callback, "calendarEvent");
				}
			});
		});
	});

	function navigateCalendar(elementName, month, year) {
		var monthTo = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(month.toLowerCase()) + 1;
		var yearFrom = new Date().getFullYear();
		var monthFrom = new Date().getMonth() + 1;
		var monthsDifference;
		var yearTo = year;
		if (yearTo == yearFrom) { //same year
			if (monthTo < monthFrom) { //past month
				for (x = 0; x < monthFrom - monthTo; x++) {
					clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[10]")));
				}
			} else { //future month
				for (x = 0; x < monthTo - monthFrom; x++) {
					clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[14]")));
				}
			}
		} else if (yearTo < yearFrom) { //past year
			//first calculate if it's more than 12 clicks to get to the date
			//go to the correct year
			for (var x = 0; x < yearFrom - yearTo; x++) {
				clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[7]")));
			}
			//go to the correct month
			if (monthTo < monthFrom) {
				// monthsDifference += monthFrom - monthTo;
				for (var x = 0; x < monthFrom - monthTo; x++) {
					clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[10]")));
				}
			} else {
				for (var x = 0; x < monthTo - monthFrom; x++) {
					clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[14]")));
				}
			}
		} else { //future year
			//go to the correct year
			for (var x = 0; x < yearTo - yearFrom; x++) {
				clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[12]")));
			}
			//go to the correct month
			if (monthTo < monthFrom) {
				for (var x = 0; x < monthFrom - monthTo; x++) {
					clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[10]")));
				}
			} else {
				for (var x = 0; x < monthTo - monthFrom % 12; x++) {
					clickElement(element(by.xpath("//div[@data-svy-name='" + elementName + "']/div/div[14]")));
				}
			}
		}
		return browser.controlFlow().execute(function () {
			return true;
		});
	}
	//END SERVOY AGENDA COMPONENT

	//SERVOY COMBOBOX
	When('servoy default typeahead component with name {elementName} the text {text} is inserted', { timeout: 60 * 1000 }, function (elementName, text, callback) {
		sendKeys(element(by.xpath("//input[@data-svy-name='" + elementName + "']")), text).then(function () {
			wrapUp(callback, "Insert value event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});

	When('servoy combobox component with name {elementName} is clicked', { timeout: 60 * 1000 }, function (elementName, callback) {
		clickElement(element(by.xpath("//data-servoydefault-combobox[@data-svy-name='" + elementName + "']"))).then(function () {
			wrapUp(callback, "Click event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});

	When('servoy combobox component with name {elementName} the text {text} is inserted', { timeout: 60 * 1000 }, function (elementName, text, callback) {
		sendKeys(element(by.xpath("//data-servoydefault-combobox[@data-svy-name='" + elementName + "']/div/input[1]")), text).then(function () {
			wrapUp(callback, "Insert value event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});
	//END SERVOY COMBOBOX

	//SERVOY BUTTON
	When('servoy button component with name {elementName} is clicked', { timeout: 60 * 1000 }, function (elementName, callback) {
		clickElement(element(by.xpath("//data-servoydefault-button[starts-with(@data-svy-name, '" + elementName + "')]/button"))).then(function () {
			wrapUp(callback, "Click event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});
	//END SERVOY BUTTON

	//SERVOY AGGRID COMPONENT
	When('servoy data-aggrid-groupingtable component with name {elementName} I scroll to the record with {string} as text', { timeout: 60 * 1000 }, function (elementName, recordText, callback) {
		findRecordAgTableComponent(elementName, recordText, callback);
	});

	When('servoy data-aggrid-groupingtable component with name {elementName} I want to {rowOption} row level {int} with {rowText} as text', { timeout: timeoutAgAction }, function (elementName, rowOption, rowLevel, rowText, callback) {
		findRecord(elementName, rowText, rowOption, rowLevel - 1, callback);
	});

	When('servoy data-aggrid-groupingtable component with name {elementName} I want to sort the table by {sortBy}', { timeout: timeoutAgAction }, function (elementName, sortBy, callback) {
		var grid = element.all(by.xpath("//data-aggrid-groupingtable[@data-svy-name='" + elementName + "']"));
		grid.each(function (menuItems) {
			menuItems.all(by.css('.ag-table-header')).each(function (sortHeader) {
				sortHeader.getText().then(function (text) {
					if (text.toLowerCase().indexOf(sortBy.toLowerCase()) > -1) {
						clickElement(sortHeader).then(function () {
							wrapUp(callback, "tableSortingEvent");
						});
					}
				});
			});
		});
	});

	When('servoy data-aggrid-groupingtable component with name {elementName} I want to group the table by {tableHeaderText}', { timeout: timeoutAgAction }, function (elementName, tableHeaderText, callback) {
		var tableHeaderCount = 0;
		var grid = element.all(by.xpath("//data-aggrid-groupingtable[@data-svy-name='" + elementName + "']"));
		grid.each(function (menuItems) {
			menuItems.all(by.css(".ag-header-cell.ag-header-cell-sortable.ag-table-header")).each(function (tableHeader) {
				tableHeader.element(by.cssContainingText("span", tableHeaderText)).isPresent().then(function (result) {
					tableHeaderCount++;
					if (result) {
						var orderByIconLocation = tableHeader.all(by.xpath("//span[@ref='eMenu']")).get(tableHeaderCount);
						browser.executeScript("arguments[0].click()", orderByIconLocation).then(function () {
							clickElement(menuItems.element(by.cssContainingText("span", "Group by " + tableHeaderText))).then(function () {
								wrapUp(callback, "tableGroupingEvent");
							});
						});
					}
				});
			});
		});
	});

	When('servoy data-aggrid-groupingtable component with name {elementName} I want to ungroup the table by {tableHeaderText}', { timeout: timeoutAgAction }, function (elementName, filterTableText, callback) {
		var grid = element.all(by.xpath("//data-aggrid-groupingtable[@data-svy-name='" + elementName + "']"));
		grid.each(function (menuItems) {
			menuItems.all(by.css(".ag-column-drop-cell")).each(function (orderByElement) {
				if (filterTableText.toLowerCase() !== "everything") {
					orderByElement.element(by.cssContainingText('.ag-column-drop-cell-text', filterTableText)).isPresent().then(function (present) {
						if (present) {
							clickElement(orderByElement.element(by.css(".ag-column-drop-cell-button"))).then(function () {
								wrapUp(callback, "removeTableFilterEvent");
							});
						}
					});
				} else {
					if (clearGrouping()) {
						wrapUp(callback, "removeTableFilterEvent");
					}
				}
			}).then(function () {
				wrapUp(callback, "removeTableFilterEvent");
			});
		});
	});

	When('servoy data-aggrid-groupingtable component with name {elementName} I want to drag the grouping item with {groupingText} as text to the start', { timeout: timeoutAgAction }, function (elementName, groupingText, callback) {
		element.all(by.xpath("//data-aggrid-groupingtable[@data-svy-name='" + elementName + "']")).each(function (gridItems) {
			var dropElement = element(by.xpath("//img[@role='presentation' and @class='ag-column-drop-icon']"));
			var groupItem = element(by.css(".ag-column-drop.ag-font-style.ag-column-drop-horizontal.ag-column-drop-row-group"))
				.element(by.xpath("//span[@class='ag-column-drop-cell-text' and .='" + groupingText + "']"));

			browser.actions().mouseMove(groupItem).mouseDown().mouseMove(dropElement).mouseUp().perform().then(function () {
				wrapUp(callback, "aggridDragEvent");
			});
		});
	});
	var rowCount = 0;
	var lastRow = 0;
	Then('servoy data-aggrid-groupingtable component with name {elementName} I expect there will be {orderCount} orders placed', { timeout: timeoutAgAction }, function (elementName, orderCount, callback) {
		element.all(by.css('.ag-column-drop-cell')).count().then(function (count) {
			return count;
		}).then(function (count) {
			browser.sleep(2000).then(function () {
				calcRows(elementName, count, orderCount, callback);
			});
		});
	});

	When('servoy data-aggrid-groupingtable component with name {elementName} I want to scroll to the top', { timeout: 60 * 1000 }, function (elementName, callback) {
		scrollToTop(elementName, callback);
	});
	//END AGGRID COMPONENT

	//DEFAULT HTML COMPONENTS
	When('default textarea component with name {elementName} the text {text} is inserted', { timeout: 60 * 1000 }, function (elementName, text, callback) {
		sendKeys(element(by.xpath("//textarea[@data-svy-name='" + elementName + "']")), text).then(function () {
			wrapUp(callback, "Insert value event");
		}).catch(function (error) {
			console.log(error.message);
			tierdown(true);
		});
	});
	//END DEFAULT HTML COMPONENTS

	//PERFORMANCE LOGGING
	When('I want to log the time it toke to do the {event} event', { timeout: 60 * 1000 }, function (event, callback) {
		var duration = calcBlockDuration(new Date());
		console.log('The ' + event + ' event toke ' + duration + ' miliseconds');
		analytics.event('Scenario 1', "Performance", event, duration).send();
		callback();
	});
	//END PERFORMANCE LOGGING


	After(function () {
		console.log('Completed scenario');
		if (!hasErrorDuringSuite) {
			tierdown(false);
		}
	});

	Before(function () {
		hasErrorDuringSuite = false;
		console.log('Starting scenario');
	});
});

function validate(input, inputToCompare) {
	expect(input).toBe(inputToCompare);
}

function wrapUp(callback, performanceEvent) {
	var duration = calcStepDuration(new Date());
	console.log('Step toke ' + duration + ' miliseconds');
	//analytics.event('Scenario 1', "Performance", performanceEvent, duration).send();
	callback();
}

function clickElement(elem) {
	return browser.wait(EC.presenceOf(elem).call(), 30000, 'Element not visible').then(function () {
		return browser.wait(EC.elementToBeClickable(elem), 30000, 'Element not clickable').then(function () {
			return elem.click();
		});
	});
}

function sendKeys(elem, input) {
	return browser.wait(EC.visibilityOf(elem).call(), 30000, 'Element not visible').then(function () {
		return elem.clear().then(function () {
			return elem.sendKeys(input);
		});
	});
}

function calcBlockDuration(timeStepCompleted) {
	if (!!tempBlockDate) {
		var stepduration = timeStepCompleted - tempBlockDate;
		tempBlockDate = timeStepCompleted;
		return stepduration;
	} else {
		var stepduration = timeStepCompleted - startBlockDate;
		tempBlockDate = timeStepCompleted;
		return stepduration;
	}
}

function calcStepDuration(timeStepCompleted) {
	if (!!tempDate) {
		var stepduration = timeStepCompleted - tempDate;
		tempDate = timeStepCompleted;
		return stepduration;
	} else {
		var stepduration = timeStepCompleted - startDate;
		tempDate = timeStepCompleted;
		return stepduration;
	}
}

function formatTimestamp(date) {
	return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' at ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

function tierdown(hasError) {
	if (hasError) {
		console.log('Has error during entire suite. Starting partial tier down');
		hasErrorDuringSuite = true;
		// setupDatabase(onErrorVersion, 'OnCrash');
	} else {
		console.log('Has no error during entire suite. Starting complete tier down');
		// setupDatabase(onCompleteVersion, 'OnComplete');
	}
}

function findRecord(elementName, recordText, callback) {
	var found = false;
	var click = 0;
	element.all(by.xpath("//div[@data-svy-name='" + elementName + "']")).each(function (childElement) {
		childElement.all(by.xpath("//div[@class='ui-grid-row ng-scope']")).each(function (grandChild) {
			grandChild.getText().then(function (text) {
				if (text.indexOf(recordText) > -1) {
					found = true;
					if (click === 0) {
						clickElement(grandChild).then(function () {
							wrapUp(callback, "Scroll event");
						});
						click++;
					}
				}
			});
		});
	}).then(function () {
		if (!found) {
			scrollToElement(elementName, recordText, callback);
		}
	});
}

function scrollToElement(elementName, recordText, callback) {
	element.all(by.xpath("//div[@data-svy-name='" + elementName + "']")).each(function (childElement) {
		var elem = childElement.all(by.xpath("//div[@class='ui-grid-row ng-scope']")).last();
		browser.executeScript("arguments[0].scrollIntoView(true);", elem.getWebElement()).then(function () {
			findRecord(elementName, recordText, callback);
		});
	});
}

function scrollToTop(elementName, callback) {
	var table = element(by.xpath("//div[@class='ag-body-container']"));
	browser.executeScript("arguments[0].scrollIntoView(true);", table.getWebElement()).then(function () {
		wrapUp(callback, "tableScrollEvent");
	});
}
//deletes previously used reports and files

function removeHtmlReports(htmlDirectory) {
	var files = find.fileSync(/\.html/, htmlDirectory);
	files.map(function (file) {
		fs.unlinkSync(file);
	});
}

function removeScreenshots(screenshotDirectory) {
	var files = find.fileSync(/\.png/, screenshotDirectory);
	files.map(function (file) {
		fs.unlinkSync(file);
	});
}

function createDirIfNotExists(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}

// AG GRID TABLE
function calcRows(elementName, count, orderCount, callback) {
	var grid = element.all(by.xpath("//data-aggrid-groupingtable[@data-svy-name='" + elementName + "']"));
	grid.each(function (menuItems) {
		//if there are no level n nodes visible, the browser has to scroll
		menuItems.all(by.xpath("//div[contains(@class, 'ag-row-level-" + count + "')]")).count().then(function (amount) {
			if (amount === 0) {
				browser.executeScript("arguments[0].scrollIntoView(true);", element.all(by.xpath("//div[@role='row']")).last()).then(function(){
					calcRows(elementName, count, orderCount, callback);
				});
			} else {
				//calcs the amount of child rows currently visible
				var firstRow = menuItems.all(by.xpath("//div[contains(@class, 'ag-row-level-" + count + "') and @row > " + lastRow + "]")).first(); //it needs to start calculating from where it left of
				var lastRowElement = menuItems.all(by.xpath("//div[contains(@class, 'ag-row-level-" + count + "') and @row > " + lastRow + "]")).last();
				firstRow.getAttribute('row').then(function (firstNumber) {
					lastRowElement.getAttribute('row').then(function (lastNumber) {
						rowCount += lastNumber - firstNumber + 1;
						lastRow = lastNumber;
						//all elements are calculated now. Now calculate if the scroll function is required
						var lastElementCheck = menuItems.all(by.xpath("//div[@role='row']")).last();
						lastElementCheck.getAttribute('class').then(function (elemClass) {
							//last element contains the same row, scroll again
							if (elemClass.indexOf("ag-row-level-" + count) !== -1) {
								scroll(elementName, lastRowElement, count, orderCount, callback);
							} else { //all elements have been checked. Validate and finalize the step
								if (rowCount == orderCount) {
									wrapUp(callback, "validatingChildRows");
								} else {
									console.log("Elements found: " + rowCount);
									console.log("Elements expected: " + orderCount);
								}
							}
						});
					});
				});
			}
		});
	});
}

function scroll(elementName, elem, count, orderCount, callback) {
	browser.executeScript("arguments[0].scrollIntoView(true);", elem.getWebElement()).then(function () {
		calcRows(elementName, count, orderCount, callback);
	});
}

function findRecord(elementName, recordText, rowOption, level, callback) {
	var found = false;
	// var click = 0;
	var grid = element.all(by.xpath("//data-aggrid-groupingtable[@data-svy-name='" + elementName + "']"));
	grid.each(function (menuItems) {
		menuItems.all(by.css(".ag-row-level-" + level + "")).each(function (row) {
			row.element(by.cssContainingText('span', recordText)).isPresent().then(function (result) {
				if (result) {
					if (rowOption == 'expand') {
						clickElement(row.element(by.css(".glyphicon.glyphicon-plus.ag-icon"))).then(function () {
							found = true;
							wrapUp(callback, "gridExpand");
						});
					} else {
						clickElement(row.element(by.css(".glyphicon.glyphicon-minus.ag-icon"))).then(function () {
							found = true;
							wrapUp(callback, "gridCollapse");
						});
					}
				}
			});
		});
	}).then(function () {
		if (!found) {
			scrollToElement(elementName, recordText, rowOption, level, callback);
		}
	});
}

function scrollToElement(elementName, recordText, rowOption, level, callback) {
	element.all(by.xpath("//data-aggrid-groupingtable[@data-svy-name='" + elementName + "']")).each(function (childElement) {
		var elem = childElement.all(by.css(".ag-row")).get(-3);
		browser.executeScript("arguments[0].scrollIntoView(true);", elem.getWebElement()).then(function () {
			findRecord(elementName, recordText, rowOption, level, callback);
		});
	});
}

function findRecordAgTableComponent(elementName, recordText, callback) {
	var found = false;
	element.all(by.xpath("//*[@data-svy-name='" + elementName + "']")).each(function (tableItems) {
		tableItems.all(by.xpath("//div[text()='"+ recordText +"']")).each(function (tableRows) {
			tableRows.getText().then(function (text) {
				console.log('AG found ' + text);
				if (text.indexOf(recordText) > -1) {
					found = true;
					// TODO click last td (to be found)
					clickElement(element(by.cssContainingText("div", recordText))).then(function () {
						console.log('clicked');
						wrapUp(callback, "Scroll event");
					});
				}
			});
		});
	}).then(function () {
		if (!found) {
			console.log('ag not found');
			scrollToElementAgTableComponent(elementName, recordText, callback);
		}
	});
}

function scrollToElementAgTableComponent(elementName, recordText, callback) {
	element.all(by.xpath("//*[@data-svy-name='" + elementName + "']")).each(function (childElement) {
		var elem = childElement.all(by.css(".ag-row")).get(-3);
		browser.executeScript("arguments[0].scrollIntoView(true);", elem.getWebElement()).then(function () {
			findRecordAgTableComponent(elementName, recordText, callback);
		});
	});
}

// SERVOY TABLE
function findRecordTableComponent(elementName, recordText, callback) {
	var found = false;
	element.all(by.xpath("//div[@data-svy-name='" + elementName + "']")).each(function (tableItems) {
		tableItems.all(by.xpath("//div[@class='ui-grid-row ng-scope']")).each(function (tableRows) {
			tableRows.getText().then(function (text) {
				if (text.indexOf(recordText) > -1) {
					found = true;
					clickElement(element(by.cssContainingText("span", recordText))).then(function () {
						wrapUp(callback, "Scroll event");
					});
				}
			});
		});
	}).then(function () {
		if (!found) {
			scrollToElementTableComponent(elementName, recordText, callback);
		}
	});
}

function scrollToElementTableComponent(elementName, recordText, callback) {
	element.all(by.xpath("//div[@data-svy-name='" + elementName + "']")).each(function (childElement) {
		var elem = childElement.all(by.xpath("//div[@class='ui-grid-row ng-scope']")).last();
		browser.executeScript("arguments[0].scrollIntoView(true);", elem.getWebElement()).then(function () {
			findRecordTableComponent(elementName, recordText, callback);
		});
	});
}

// SERVOY EXTRA TABLE
function findRecordTableExtraComponent(elementName, recordText, callback) {
	var found = false;
	element.all(by.xpath("//*[@data-svy-name='" + elementName + "']")).each(function (tableItems) {
		tableItems.all(by.xpath("//td/div[text()='"+ recordText +"']")).each(function (tableRows) {
			tableRows.getText().then(function (text) {
				console.log('found ' + text);
				if (text.indexOf(recordText) > -1) {
					found = true;
					// TODO click last td (to be found)
					clickElement(element(by.cssContainingText("div", recordText))).then(function () {
						console.log('clicked');
						wrapUp(callback, "Scroll event");
					});
				}
			});
		});

		// tableItems.all(by.xpath("//td/div")).each(function (tableRows) {
		// 	tableRows.getText().then(function (text) {
		// 		if (text.indexOf(recordText) > -1) {
		// 			found = true;
		// 			clickElement(element(by.cssContainingText("div", recordText))).then(function () {
		// 				wrapUp(callback, "Scroll event");
		// 			});
		// 		}
		// 	});
		// });
	}).then(function () {
		if (!found) {
			console.log('not found');
			scrollToElementTableExtraComponent(elementName, recordText, callback);
		}
	});
}

function scrollToElementTableExtraComponent(elementName, recordText, callback) {
	element.all(by.xpath("//*[@data-svy-name='" + elementName + "']")).each(function (childElement) {
		var elem = childElement.all(by.xpath("//tr")).last();
		browser.executeScript("arguments[0].scrollIntoView(true);", elem.getWebElement()).then(function () {
			findRecordTableExtraComponent(elementName, recordText, callback);
		});
	});
}
