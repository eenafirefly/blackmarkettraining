<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */
class AX_Settings_Tab_Portfolio_Checklist_Mapping
{
    private $portfolio_checklist_mapping_setting_key = 'axip_portfolio_checklist_mapping_settings';
    const portfolio_checklist_mapping_setting_key = 'axip_portfolio_checklist_mapping_settings';
    public function __construct()
    {
    }
    public function register_settings()
    {
        /**
         * * Add Course Mapping Configuration Settings **
         */

        add_settings_section('section_portfolio_checklist_map', __('Portfolio Checklist Mapping', 'axip'), array(
            &$this,
            'section_mapping_desc',
        ), self::portfolio_checklist_mapping_setting_key);

        add_option('ax_portfolio_checklist_mapping_settings', '', '', false);
        register_setting(self::portfolio_checklist_mapping_setting_key, 'ax_portfolio_checklist_mapping_settings');
        add_settings_field('ax_portfolio_checklist_mapping_settings', __('Mapping Configuration:', 'axip'), array(
            &$this,
            'field_mapping_table',
        ), self::portfolio_checklist_mapping_setting_key, 'section_portfolio_checklist_map');
    }

    public function section_mapping_desc()
    {
        echo 'Mapping created in this section will overwrite the portfolio checklist used for the specific Course and Enroller Configurations.';
        echo '<p><em>These mapping rules will not apply to the shopping cart, the multiple course enrolments feature or course search based configs.</em></p>';
    }

    public function field_mapping_table()
    {
        $VERSION = constant('AXIP_PLUGIN_VERSION');
        if ($VERSION === null) {
            $VERSION = time();
        }
        $Settings_Plugin = new Settings_API_Tabs_AXIP_Plugin();
        $Settings_Plugin->ax_deregister_load_general_scripts();

        $mapping_settings = get_option('ax_portfolio_checklist_mapping_settings');
        /* Build a Post Array and a Course Array for passing to the Mapping Widget */
        $AxcelerateAPI = new AxcelerateAPI();
        $courseList = $AxcelerateAPI->callResource(array(
            "displayLength" => 9999,
        ), '/courses', 'GET');
        $mapArray1 = array();

        foreach ($courseList as $row) {
            $tempArray = array(
                'ID' => $row->ID,
                'MAP_KEY' => $row->ID,
                'NAME' => $row->NAME,
            );
            if (!empty($row->STREAMNAME)) {
                $tempArray['NAME'] = $tempArray['NAME'] . '(' . $row->STREAMNAME . ')';
            }
            array_push($mapArray1, $tempArray);

        }

        //ADD CONFIG SEARCH

        $enrollerWidgetSettings = get_option('ax_enroller_widget_settings');
        if (!empty($enrollerWidgetSettings)) {
            $data = json_decode($enrollerWidgetSettings, true, 10);

            $mapArray2 = array();

            foreach ($data as $key => $value) {
                $tempArray = array(
                    'ID' => $key,
                    'CONFIG_ID' => $key,
                    'MAP_KEY' => $key,
                );
                if (!empty($value['config_name'])) {
                    $tempArray['CONFIG_NAME'] = $value['config_name'];
                } else {
                    $tempArray['CONFIG_NAME'] = "Config_ID: " . $key;
                }
                array_push($mapArray2, $tempArray);

            }

            /*Build portfolio array for passing to the mapping widget */

            $portfolioList = $AxcelerateAPI->callResource(array(
                "displayLength" => 9999,
            ), '/portfolio/checklists', 'GET');
            $mapArray3 = array();

            foreach ($portfolioList as $row) {
                $tempArray = array(
                    'ID' => $row->PORTFOLIOCHECKLISTID,
                    'NAME' => $row->NAME,
                    'MAP_KEY' => $row->PORTFOLIOCHECKLISTID,
                );
                array_push($mapArray3, $tempArray);
            }

            /* Load Scripts */
            wp_enqueue_editor();
            wp_register_script('portfolio-checklist-mapping', plugins_url('/enrollerWidget/portfolio-checklist-mapping.js', AXIP_PLUGIN_NAME), array(), $VERSION);
            wp_enqueue_script('portfolio-checklist-mapping');
            wp_localize_script('portfolio-checklist-mapping', 'course_config_vars', array(
                'mapping_settings' => $mapping_settings,
                'mapping_list_1' => $mapArray1,
                'mapping_list_2' => $mapArray2,
                'mapping_list_3' => $mapArray3,
            ));

            wp_register_style('course_mapping', plugins_url('/enrollerWidget/mapping-widget.css', AXIP_PLUGIN_NAME), array(), $VERSION);
            wp_enqueue_style('course_mapping');

            ?>
				<div id="course_mapping_holder">
					<div id="ax_mapping_widget_holder"></div>
					<input type="hidden" id="ax_portfolio_checklist_mapping_settings" name="ax_portfolio_checklist_mapping_settings" value="<?php echo htmlspecialchars($mapping_settings) ?>" />
				</div>
			<?php
}
    }

}