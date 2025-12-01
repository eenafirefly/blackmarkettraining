jQuery(function($) {
    var mapping_settings;
    var environment = "wordpress";
    if (config_comp_vars.mapping_settings != null && config_comp_vars.mapping_settings != "") {
        mapping_settings = $.parseJSON(config_comp_vars.mapping_settings);
    } else {
        mapping_settings = {};
    }

    if ($.fn.chosen != null) {
        $("select").chosen({ width: "30em" });
    }

    function save_configuration(fullConfig) {
        $("#ax_config_resumption_mapping_settings").val(JSON.stringify(fullConfig));
    }
    $.axWidget("axcelerate.resumption_config", {
        options: {
            mapping_settings: null,
            active_rule: null,
            active_rule_id: null,
            save_configuration: null,
            mapping_list_1: null,
            mapping_list_2: null
        },

        _create: function() {
            var mapW = this;

            mapW._buildMainUI();
        },
        _setOption: function(key, value) {
            this._super(key, value);
        },

        _buildMainUI: function() {
            var mapW = this;
            var holder = $('<div class="ax-map-widget"></div>');
            mapW.element.append(holder);
            holder.append(mapW._createControls("mapping"));
            var tableHolder = $('<div class="ax-map-table-holder"></div>');
            var table = $('<table class="ax-map-table"></table>');
            holder.append(tableHolder.append(table));

            var mapEditHolder = $('<div class="ax-map-editor"></div>');
            holder.append(mapEditHolder);
            var mapList1Select = mapW._createMapSelectList(mapW.options.mapping_list_1, "ax_map_1");
            mapEditHolder.append(
                mapW._inputFieldHolder("ax_map_1", "Select Config").append(mapList1Select)
            );

            var mapList2Select = mapW._createMapSelectList(
                [
                    { type_display: "Abandonment", resumption_type: "abandonment" },
                    { type_display: "Verification", resumption_type: "verify" },
                    { type_display: "Requested", resumption_type: "requested" }
                ],
                "ax_map_2"
            );
            mapEditHolder.append(
                mapW._inputFieldHolder("ax_map_2", "Resumption Type").append(mapList2Select)
            );

            var templateField = $('<input type="number">').attr("id", "ax_template_id");
            mapEditHolder.append(
                mapW._inputFieldHolder("ax_template_id", "Template ID").append(templateField)
            );

            var saveMap = $(
                '<a class="ax-map-save ui-btn ui-btn-icon-right ui-icon-check">Save Mapping</a>'
            );
            var saveMapHolder = mapW
                ._inputFieldHolder("ax_save_map", "Save Mapping")
                .append(saveMap);

            mapEditHolder.find("select").chosen({ disable_search_threshold: 10, width: "400px" });
            mapEditHolder.append(saveMapHolder);

            mapW._refreshMappingTable();
            mapEditHolder.hide();
        },
        _createControls: function(area) {
            var mapW = this;
            var naming = "";
            if (area == "mapping") {
                naming = "Mapping";
            }

            var controls = $('<div class="ax-config-controls" />');
            controls.addClass(area);
            controls.append(
                $(
                    '<a class="ui-btn ax-link edit ui-icon-eye ui-btn-icon-right ax-show-hide" >Hide ' +
                        naming +
                        "s</a>"
                )
            );
            controls.append(
                $(
                    '<a class="ui-btn ax-link add ui-icon-plus ui-btn-icon-right ax-add-new" >Add New ' +
                        naming +
                        "</a>"
                )
            );
            controls.find("a").css("display", "inline-block");

            controls.find(".ax-show-hide").on("click", function() {
                if (area == "mapping") {
                    mapW._toggleMappingList();
                }
            });
            controls.find(".ax-add-new").on("click", function() {
                if (area == "mapping") {
                    mapW._addMapping();
                }
            });
            return controls;
        },
        _refreshMappingTable: function() {
            var mapW = this;
            if (mapW.element.find(".ax-map-table").length) {
                mapW.element.find(".ax-map-table-holder").empty();
                mapW.element
                    .find(".ax-map-table-holder")
                    .append($('<table class="ax-map-table"></table>'));
            }
            var columns = [
                { title: "Config", data: "config_name", visible: true },
                { title: "Resumption Type", data: "resumption_type", visible: false },
                { title: "Resumption Type", data: "type_display", visible: true },
                { title: "MapKeyCombo", data: "mapping_key", visible: false },
                { title: "config_id", data: "config_id", visible: false },
                { title: "TemplateID", data: "template_id", visible: true },
                { title: "Action", data: "ACTION", visible: true }
            ];
            var data = mapW._dataTableMapList(mapW.options.mapping_settings);
            var table = mapW.element.find(".ax-map-table").DataTable({
                data: data,
                columns: columns,
                searching: true,
                info: false,
                paging: true
            });

            mapW.element.find(".ax-map-table").on("click", ".ax-map-action-edit", function(e) {
                var selectedField = table.row($(this).closest("tr")).data();
                mapW._addMapping(selectedField);
            });

            mapW.element.find(".ax-map-table").on("click", ".ax-map-action-delete", function(e) {
                var selectedField = table.row($(this).closest("tr")).data();
                mapW._deleteMapping(selectedField);
            });
        },
        _dataTableMapList: function(mapList) {
            var mapW = this;
            var dtConfig = [];
            if (mapList == null) {
                return [];
            }
            $.each(mapList, function(key, value) {
                var baseClass = "ui-btn ui-mini ui-btn-icon-right ui-btn-icon-notext";
                var actionEdit =
                    '<a class="' +
                    baseClass +
                    ' ui-icon-edit ax-map-action ax-map-action-edit">Edit</a>';
                var actionDelete =
                    '<a class="' +
                    baseClass +
                    ' ui-icon-delete ax-map-action ax-map-action-delete">Delete</a>';
                var temp = $.extend(
                    {
                        ACTION: "<div>" + actionEdit + actionDelete + "</div>"
                    },
                    value
                );
                dtConfig.push(temp);
            });
            return dtConfig;
        },
        _toggleMappingList: function(hide) {
            var button = $(".ax-config-controls.mapping a.ax-show-hide");

            if ($(".ax-map-table").is(":visible") || hide == true) {
                $(".ax-map-table-holder").hide();
                button.text("Show Mappings");
            } else {
                $(".ax-map-table-holder").show();
                button.text("Hide Mappings");
            }
            if (hide == false) {
                $(".ax-map-table-holder").show();
                button.text("Hide Mappings");
            }
        },
        _saveConfiguration: function() {
            var mapW = this;
            mapW.options.save_configuration(mapW.options.mapping_settings);
        },

        _createMapSelectList: function(list, id) {
            var selectList = $('<select class="ax-map-select"></select>');
            selectList.attr("id", id);
            if (list != null) {
                $.each(list, function(i, record) {
                    var option = $("<option></option>");
                    if (id == "ax_map_1") {
                        option.attr("value", record.config_id);

                        option.data("id", record.config_id);
                        option.data("name", record.config_name);
                        option.append(record.config_name);
                    } else if (id == "ax_map_2") {
                        option.attr("value", record.resumption_type);
                        option.data("name", record.type_display);
                        option.append(record.type_display);
                    }

                    selectList.append(option);
                });
            }
            return selectList;
        },
        _addMapping: function(mapping) {
            var mapW = this;
            var updating = false;
            mapW.element.find(".ax-map-editor").show();
            mapW._toggleMappingList(true);
            $("#ax_map_1")
                .prop("disabled", false)
                .trigger("chosen:updated");
            var saveButton = mapW.element.find(".ax-map-save");
            saveButton.off();
            if (mapping != null) {
                updating = true;
                //*disable the first select list - to ensure the ID does not change*/
                $("#ax_map_1")
                    .val(mapping.config_id)
                    .trigger("chosen:updated");

                $("#ax_map_2")
                    .val(mapping.resumption_type)
                    .trigger("chosen:updated");
                $("#ax_template_id").val(mapping.template_id);
            }

            saveButton.on("click", function() {
                var mList1 = $("#ax_map_1");
                var mList2 = $("#ax_map_2");
                var template = $("#ax_template_id");

                if (isNaN(template.val()) || (!isNaN(template.val()) && template.val() <= 0)) {
                    return;
                }
                var newMapping = {
                    mapping_key: mList1.val() + "_" + mList2.val(),
                    config_id: mList1.find("option:selected").data("id"),
                    resumption_type: mList2.val(),
                    config_name: mList1.find("option:selected").data("name"),
                    template_id: template.val(),
                    type_display: mList2.find("option:selected").data("name")
                };
                if (mapW.options.mapping_settings != null) {
                    mapW.options.mapping_settings[newMapping.mapping_key] = newMapping;
                } else {
                    mapW.options.mapping_settings = {};
                    mapW.options.mapping_settings[newMapping.mapping_key] = newMapping;
                }

                if (mapping && mapping.mapping_key !== newMapping.mapping_key) {
                    mapW._deleteMapping(mapping);
                }

                mapW.element.find(".ax-map-editor").hide();
                mapW._saveConfiguration();
                mapW._refreshMappingTable();
                mapW._toggleMappingList(false);
            });
        },

        _deleteMapping: function(mapping) {
            var mapW = this;
            delete mapW.options.mapping_settings[mapping.mapping_key];
            mapW._saveConfiguration();
            mapW._refreshMappingTable();
            mapW._toggleMappingList(false);
        },
        _inputFieldHolder: function(fieldID, labelName) {
            var fieldClass = fieldID.replace(/_/g, "-");
            var div = $('<div class="ax-step-input-holder" />');
            var label = $('<label class="ax-step-input-label">' + labelName + ":</label>");
            div.addClass(fieldClass);
            label.attr("for", fieldID);
            div.append(label);
            return div;
        }
    });

    $("#ax_mapping_widget_holder").resumption_config({
        mapping_settings: mapping_settings,
        save_configuration: save_configuration,
        mapping_list_1: config_comp_vars.mapping_list_1
    });

    $("#wpfooter").css("position", "relative");
});
