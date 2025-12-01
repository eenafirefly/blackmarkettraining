<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */
class AX_Settings_Tab_Enrolment_Resumption
{
    private $enroller_enrolment_resumption_settings_key = 'axip_enroller_resumption_settings';
    const enroller_enrolment_resumption_settings_key = 'axip_enroller_resumption_settings';
    public function __construct()
    {
    }
    public function register_settings()
    {
        add_settings_section('section_enroller_resumption', __('Enrolment Resumption', 'axip'), array(
            &$this,
            'section_enroller_resumption_desc',
        ), self::enroller_enrolment_resumption_settings_key);

        /*
         * Enrolment Notifications
         */
        add_option('ax_enrol_notifications_active', false, '', false);
        register_setting(self::enroller_enrolment_resumption_settings_key, 'ax_enrol_notifications_active');
        add_settings_field('ax_enrol_notifications_active', __('Resumption Enabled:', 'axip'), array(
            &$this,
            'field_enrol_notifications_active',
        ), self::enroller_enrolment_resumption_settings_key, 'section_enroller_resumption');

        /*
         * Templates
         */
        add_option('ax_enrol_resumption_template_id', false, '', false);
        register_setting(self::enroller_enrolment_resumption_settings_key, 'ax_enrol_resumption_template_id', array(
            &$this,
            'sanitize_parse_number',
        ));

        add_settings_field('ax_enrol_resumption_template_id', __('Default Template ID:', 'axip'), array(
            &$this,
            'field_enrol_resumption_template_id',
        ), self::enroller_enrolment_resumption_settings_key, 'section_enroller_resumption');

        add_settings_field('ax_enrol_resumption_template_id_verify', __('Verify Contact TemplateID:', 'axip'), array(
            &$this,
            'field_enrol_resumption_template_id_verify',
        ), self::enroller_enrolment_resumption_settings_key, 'section_enroller_resumption');

        add_option('ax_enrol_resumption_template_id_verify', false, '', false);
        register_setting(self::enroller_enrolment_resumption_settings_key, 'ax_enrol_resumption_template_id_verify', array(
            &$this,
            'sanitize_parse_number',
        ));

        add_option('ax_enrol_resumption_template_id_requested', false, '', false);
        register_setting(self::enroller_enrolment_resumption_settings_key, 'ax_enrol_resumption_template_id_requested', array(
            &$this,
            'sanitize_parse_number',
        ));

        add_settings_field('ax_enrol_resumption_template_id_requested', __('Requested TemplateID:', 'axip'), array(
            &$this,
            'field_enrol_resumption_template_id_requested',
        ), self::enroller_enrolment_resumption_settings_key, 'section_enroller_resumption');

        add_option('ax_enrol_resumption_debug_mode', false, '', false);
        register_setting(self::enroller_enrolment_resumption_settings_key, 'ax_enrol_resumption_debug_mode');

        add_settings_field('ax_enrol_resumption_debug_mode', __('Debug Mode:', 'axip'), array(
            &$this,
            'debug_mode_display',
        ), self::enroller_enrolment_resumption_settings_key, 'section_enroller_resumption');

        add_option('ax_config_resumption_mapping_settings', false, '', false);
        register_setting(self::enroller_enrolment_resumption_settings_key, 'ax_config_resumption_mapping_settings');

        add_settings_field('ax_config_resumption_mapping_settings', __('Config Resumption Mapping:', 'axip'), array(
            &$this,
            'field_mapping_table',
        ), self::enroller_enrolment_resumption_settings_key, 'section_enroller_resumption');

    }

    public function setupNotificationSchedule($notifications_active = false)
    {

        if ($notifications_active) {
            AX_Enrolments::setupReminderTasks();
            echo '<div class="notice notice-success is-dismissible"><h4>Enrolment Notifications Scheduled Every 2 hours, starting in 2 minutes.</h4></div>';
        } else {
            AX_Enrolments::clearReminderTasks();
            echo '<div class="notice is-dismissible notice-info"><h4>Notifications Schedule Cleared.</h4></div>';
        }
    }
    public function field_enrol_notifications_active()
    {

        $Settings_Plugin = new Settings_API_Tabs_AXIP_Plugin();
        $Settings_Plugin->ax_deregister_load_general_scripts();

        $Settings_Plugin->ax_load_settings_helper();

        $optVal = get_option('ax_enrol_notifications_active');
        $optActive = !empty($optVal);

        self::setupNotificationSchedule($optActive);

        if (!$optActive) {
            $optVal = 0;
            update_option('ax_enrol_notifications_active', $optVal, false);
        }
        $options = array(
            0 => "Not Enabled",
            1 => "Enabled",
        );
        echo '<select name="ax_enrol_notifications_active">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';

    }

    public function debug_mode_display()
    {
        $debugVal = get_option('ax_enrol_resumption_debug_mode');
        $debugActive = !empty($debugVal);
        if (!$debugActive) {
            $debugVal = 0;
            update_option('ax_enrol_resumption_debug_mode', $debugVal, false);
        } else {
            AX_Enrolments::sendReminders();
        }
        $options = array(
            0 => "Not Enabled",
            1 => "Enabled",
        );
        echo '<select name="ax_enrol_resumption_debug_mode">';
        foreach ($options as $key => $value) {
            if ($key == $debugVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>Bypass the last hour check - allowing notifications to be sent immediately. Notifications will run when this page is refreshed.</em></p>';
    }

    public function sanitize_parse_number($option)
    {
        //sanitize
        $option = intval(sanitize_text_field($option), 10);

        return $option;
    }

    public function field_enrol_resumption_template_id()
    {
        $opt = get_option('ax_enrol_resumption_template_id');
        echo '<input type="number" name="ax_enrol_resumption_template_id" value="' . $opt . '" />';
        echo '<p><em>Template ID of the template (within aXcelerate) that you wish to use for notifications to students on abandoned/incomplete enrolments.</em></p>';
        echo '<p><em>The string [Online Enrolment Link] within the template will be replaced by a URL to continue with the Enrolment.</em></p>';

    }
    public function field_enrol_resumption_template_id_requested()
    {
        $opt = get_option('ax_enrol_resumption_template_id_requested', 0);
        echo '<input type="number" name="ax_enrol_resumption_template_id_requested" value="' . $opt . '" />';
        echo '<p><em>Template ID of the template (within aXcelerate) that you wish to use for notifications to students who use the "Send me a Resumption link" feature.</em></p>';
        echo '<p><em>The string [Online Enrolment Link] within the template will be replaced by a URL to continue with the Enrolment.</em></p>';

    }
    public function field_enrol_resumption_template_id_verify()
    {
        $opt = get_option('ax_enrol_resumption_template_id_verify', 0);
        echo '<input type="number" name="ax_enrol_resumption_template_id_verify" value="' . $opt . '" />';
        echo '<p><em>Template ID of the template (within aXcelerate) that you wish to use for emails used to verify the identity of the user, when their email address matches an existing contact.</em></p>';
        echo '<p><em>The string [Online Enrolment Link] within the template will be replaced by a URL to continue with the Enrolment.</em></p>';

    }

    public function section_enroller_resumption_desc()
    {
        echo '<p>Resumption of Enrolment - Enable Notifications to students who have started, but not completed online enrolment. Notifications will be checked/sent every 2 hours.</p>';
        echo '<p>If the enrolment has been updated within the last hour the notification will not be sent, to prevent spam. Only one notification per enrolment will be generated.</p>';
    }

    public function field_mapping_table()
    {

        echo '<p><em>Map specific Enrolment Widget Configurations and Resumption types to templates.</em></p>';
        $VERSION = constant('AXIP_PLUGIN_VERSION');
        if ($VERSION === null) {
            $VERSION = time();
        }

        $mapping_settings = get_option('ax_config_resumption_mapping_settings');
        /* Build a Post Array and a Course Array for passing to the Mapping Widget */

        /*get Config list*/
        $enrollerWidgetSettings = get_option('ax_enroller_widget_settings');
        $data = json_decode($enrollerWidgetSettings, true, 10);

        $mapArray1 = array();

        foreach ($data as $key => $value) {
            $tempArray = array(
                'config_id' => $key,
            );
            if (!empty($value['config_name'])) {
                $tempArray['config_name'] = $value['config_name'];
            } else {
                $tempArray['config_name'] = "Config_ID: " . $key;
            }
            array_push($mapArray1, $tempArray);

        }

        /* Load Scripts */
        wp_register_script('config-resumption', plugins_url('/enrollerWidget/config-resumption.js', AXIP_PLUGIN_NAME), array(), $VERSION);
        wp_enqueue_script('config-resumption');
        wp_localize_script('config-resumption', 'config_comp_vars', array(
            'mapping_settings' => $mapping_settings,
            'mapping_list_1' => $mapArray1,

        ));

        wp_register_style('enroller-config', plugins_url('/enrollerWidget/config-widget.css', AXIP_PLUGIN_NAME), array(), $VERSION);
        wp_enqueue_style('enroller-config');

        wp_register_style('course_mapping', plugins_url('/enrollerWidget/mapping-widget.css', AXIP_PLUGIN_NAME), array(), $VERSION);
        wp_enqueue_style('course_mapping');

        echo '<div id="course_mapping_holder">';

        echo '<div id="ax_mapping_widget_holder"></div>';
        echo '<input type="hidden" id="ax_config_resumption_mapping_settings" name="ax_config_resumption_mapping_settings" value="' . htmlspecialchars($mapping_settings) . '" />';
        echo '</div>';

    }

}
