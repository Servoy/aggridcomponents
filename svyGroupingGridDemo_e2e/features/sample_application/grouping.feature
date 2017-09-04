Feature: Testing the aagrid component
    Scenario Outline: Protractor and Cucumber Test

Given I go to http://localhost:8080/solutions/svyGroupingGridDemo/index.html?f=agGridOrders

#group/ungroup - Grouping works. Ungrouping works fine
# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to group the table by Customer
# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to ungroup the table by Customer City

#sorting - works
# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to sort the table by Country
# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to sort the table by Customer City

#expand - works (based upon 'group' rows)
When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to expand the row with Greenland as text
When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to expand the child row with Nuuk as text
# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to expand the child row with Alfreds Futterkiste as text test

#works under certain conditions: the elements checked are the ones of 'ag-row-level-2' and all have to be visible
Then servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I expect there will be 13 orders placed

#collapse - works (based upon 'group' rows)
# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to collapse the child row with Algiers as text
# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to collapse the row with Algeria as text


# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to expand the row with Greenland as text
# When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to expand the child row with Nuuk as text

#remove all groupings - works
When servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I want to ungroup the table by Everything









# Then servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I expect there will be 13 orders placed by Ernst Handel
# Then servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I expect there will be 13 orders placed in London
# Then servoy data-aggrid-groupingtable component with name agGridOrders.groupingtable_1 I expect there will be 13 orders placed in France


# When servoy sidenav component with name galleryMain.nav tab Working with Data is clicked
# When servoy sidenav component with name galleryMain.nav tab Cryptography is clicked
# When servoy combobox component with name exampleCrypto.algorithm is clicked
# When servoy combobox component with name exampleCrypto.algorithm is clicked
# When servoy combobox component with name exampleCrypto.algorithm the text <algorithm> is inserted
# When I press enter
# When servoy button component with name exampleCrypto.generateKey is clicked
# When default textarea component with name exampleCrypto.plainText the text secret code is inserted
# When servoy button component with name exampleCrypto.svy_ is clicked
# When I want to log the time it toke to do the cryptography event

@data_table_servoy
Examples:
| algorithm     |
| DES           |
# | DES           |
# | DES           |
# | DES           |
# | DES           |
# | DES           |
# | DES           |
# | DES           |
# | DES           |
# | DES           |
# | DES           |
# | DES           |
# | AES           |