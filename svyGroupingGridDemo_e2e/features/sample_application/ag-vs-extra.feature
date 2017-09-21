Feature: Testing the aagrid component
    Scenario Outline: Protractor and Cucumber Test

Given I go to http://localhost:8080/solutions/svyGroupingGridDemo/index.html?f=agGridOrders

# TODO table doesn't scroll up. Should test the possibility to scroll up

#perfomance
When servoy button component with name mainGroupingGridTabs.btnAgGridVsExtraTable is clicked

When servoy extra table component with name <tableName> I want to measure the time it takes to render the cell with text 10,248

When servoy button component with name mainGroupingGridTabs.btnAgGridOrders is clicked
When servoy button component with name mainGroupingGridTabs.btnAgGridVsExtraTable is clicked

When servoy extra table component with name <tableName> I want to measure the time it takes to render the cell with text 10,248

When servoy button component with name mainGroupingGridTabs.btnAgGridOrders is clicked
When servoy button component with name mainGroupingGridTabs.btnAgGridVsExtraTable is clicked

When servoy default typeahead component with name agGridOrdersVsSvyExtra.fieldSearch the text Alfreds Futterkiste is inserted

#When servoy button component with name mainGroupingGridTabs.btnAgGridVsExtraTable is clicked
When servoy button component with name agGridOrdersVsSvyExtra.btnSearch is clicked

When servoy extra table component with name <tableName> I want to measure the time it takes to render the cell with text 10,692

When servoy button component with name mainGroupingGridTabs.btnAgGridOrders is clicked
When servoy button component with name mainGroupingGridTabs.btnAgGridVsExtraTable is clicked

When servoy extra table component with name <tableName> I want to measure the time it takes to render the cell with text 10,692

@data_table_servoy
Examples:
| tableName       |
| agGridOrdersVsSvyExtra.table_1 |
| agGridOrdersVsSvyExtra.groupingtable_1 |