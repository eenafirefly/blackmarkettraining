<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */
class AX_Settings_Tab_Enroller
{

    const enroller_settings_key = 'axip_enroller_settings';
    public function __construct()
    {
    }
    public function register_settings()
    {

        add_settings_section('section_enroller', __('Enrolment Widget Settings', 'axip'), array(
            &$this,
            'section_enroller_desc',
        ), self::enroller_settings_key);

        add_option('ax_enroller_widget_settings', '', '', false);
        register_setting(self::enroller_settings_key, 'ax_enroller_widget_settings');

        add_option('ax_staging_override', '', '', false);
        register_setting(self::enroller_settings_key, 'ax_staging_override');

        add_option('ax_enrolment_unique_emails', '', '', false);
        register_setting(self::enroller_settings_key, 'ax_enrolment_unique_emails');

        add_option('ax_google_maps_api_key', '', '', false);
        register_setting(self::enroller_settings_key, 'ax_google_maps_api_key');

        if (get_option('ax_staging_override', false)) {
            add_settings_field('ax_staging_override', __('Force Enroller Widget to use Staging:', 'axip'), array(
                &$this,
                'field_staging_override',
            ), self::enroller_settings_key, 'section_enroller');
        }

        add_settings_field('ax_enrolment_unique_emails', __('Unique Emails:', 'axip'), array(
            &$this,
            'field_ax_enrolment_unique_emails',
        ), self::enroller_settings_key, 'section_enroller');

        add_settings_field('ax_google_maps_api_key', __('Google Maps API Key:', 'axip'), array(
            &$this,
            'ax_google_maps_api_key',
        ), self::enroller_settings_key, 'section_enroller');

        add_settings_field('ax_enroller_widget_settings', __('Enroller Widget Configuration:', 'axip'), array(
            &$this,
            'ax_enroller_widget_settings',
        ), self::enroller_settings_key, 'section_enroller');

    }
    public function field_staging_override()
    {
        $use_staging = get_option('ax_staging_override');
        if (empty($use_staging)) {
            $use_staging = 0;
            update_option('ax_staging_override', $use_staging, false);
        }
        $options = array(
            0 => "No Override",
            1 => "Force Widget to use Staging",
        );
        echo '<select name="ax_staging_override">';
        foreach ($options as $key => $value) {
            if ($key == $use_staging) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
    }

    public function ax_google_maps_api_key()
    {
        $optVal = get_option('ax_google_maps_api_key', "");
        echo '<input name="ax_google_maps_api_key" type="text" value="' . $optVal . '" />';
        echo '<p><em>API key for use with the Google Places Address Autocomplete (Address Step type)</em></p>';
    }

    public function field_ax_enrolment_unique_emails()
    {

        $unique_emails = get_option('ax_enrolment_unique_emails', 'unset');
        if ($unique_emails === 'unset') {
            $unique_emails = true;
            update_option('ax_enrolment_unique_emails', true, false);
        }

        $options = array(
            0 => "Not unique",
            1 => "Emails must be unique.",
        );
        echo '<select name="ax_enrolment_unique_emails">';
        foreach ($options as $key => $value) {
            if ($key == $unique_emails) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';

    }

    public function ax_enroller_widget_settings()
    {
        $VERSION = constant('AXIP_PLUGIN_VERSION');
        if ($VERSION === null) {
            $VERSION = time();
        }
        $Settings_Plugin = new Settings_API_Tabs_AXIP_Plugin();
        $Settings_Plugin->ax_deregister_load_general_scripts();
        $Settings_Plugin->ax_load_settings_helper();

        $enrollerWidgetSettings = get_option('ax_enroller_widget_settings');
        if (empty($enrollerWidgetSettings)) {
            $ew_legacy = get_option('axip_general_settings');
            if (key_exists('ax_enroller_widget_settings', $ew_legacy)) {
                $enrollerWidgetSettings = isset($ew_legacy['ax_enroller_widget_settings']) ? esc_attr($ew_legacy['ax_enroller_widget_settings']) : '';
            } else {
                $enrollerWidgetSettings = '';
            }
        }
        $AxApi = new AxcelerateAPI();
        $customfields = [];
        $return = $AxApi->callResource(array('displayLength' => 100), '/customFields/', 'GET');

        if (is_array($return) && count($return) >= 1 && isset($return[0]->LINKTO)) {
            $customfields = $return;
        }

        wp_register_script('enroller-defaults', plugins_url('/enrollerWidget/widget/enroller-defaults.js', AXIP_PLUGIN_NAME), array(), $VERSION);
        wp_enqueue_script('enroller-defaults');
        wp_localize_script('enroller-defaults', 'enroller_default_vars', array(
            'ajaxURL' => admin_url('admin-ajax.php'),
        ));
        wp_register_script('enroller-config', plugins_url('/enrollerWidget/enrol-config-widget.js', AXIP_PLUGIN_NAME), array(
            'jquery',
            'enroller-defaults',
            'dataTables',
        ), $VERSION);
        wp_enqueue_script('enroller-config');

        wp_register_style('widget_replace', plugins_url('/enrollerWidget/widget/css/widget_replacements.css', AXIP_PLUGIN_NAME), array(), $VERSION);
        wp_enqueue_style('widget_replace');

        wp_register_style('enroller-config', plugins_url('/enrollerWidget/config-widget.css', AXIP_PLUGIN_NAME), array(), $VERSION);
        wp_enqueue_style('enroller-config');

        wp_register_script('cw_after_init', plugins_url('/enrollerWidget/cw_after_init.js', AXIP_PLUGIN_NAME), array(
            'jquery',
            'enroller-defaults',
            'enroller-config',
        ), $VERSION);
        wp_enqueue_script('cw_after_init');
        wp_localize_script('cw_after_init', 'after_init_vars', array(
            'ajaxURL' => admin_url('admin-ajax.php'),
            'config_widget_settings' => $enrollerWidgetSettings,
            'available_customfields' => $customfields,
        ));

        ?>
			<div id="enroller_config_holder" style="z-index:1; position:relative; left:-200px; margin-right:-200px;">
            <label style="margin-bottom:8px; padding:4px; display:block"><input type="checkbox" style=""id="download_backups" onchange="window.download_backups = window.download_backups!==true;"/>Download Backups On Save</label>

				<input type="hidden" id="enroller_widget_settings" name="ax_enroller_widget_settings" value="<?php echo htmlspecialchars($enrollerWidgetSettings) ?>"/>
			</div>
			<div id="enroller_config_widget"></div>
			<?php
}

    public function section_enroller_desc()
    {
        echo 'This section allows for custom configurations for the Enrolment Widget.';
        echo '<p><em>Enrolment widgets can be used for enrolment, enquiries, or updating student data, depending on configuration.</em></p>';
    }

}
