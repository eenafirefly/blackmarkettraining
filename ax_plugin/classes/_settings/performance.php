<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */
class AX_Settings_Tab_Performance
{
    private $axip_performance_settings = 'axip_performance_settings';
    const axip_performance_settings_key = 'axip_performance_settings';
    public function __construct()
    {
    }
    public function register_settings()
    {
        add_settings_section('section_performance', __('Performance/Debug Settings', 'axip'), array(
            &$this,
            'section_performance_desc',
        ), self::axip_performance_settings_key);

        add_option('ax_caching_enabled', '', '', false);
        register_setting(self::axip_performance_settings_key, 'ax_caching_enabled');
        add_settings_field('ax_caching_enabled', __('API Call Caching:', 'axip'), array(
            &$this,
            'field_caching_enabled',
        ), self::axip_performance_settings_key, 'section_performance');

        add_option('ax_resumption_performance', '', '', false);
        register_setting(self::axip_performance_settings_key, 'ax_resumption_performance');
        add_settings_field('ax_resumption_performance', __('Query Restriction:', 'axip'), array(
            &$this,
            'field_resumption_performance',
        ), self::axip_performance_settings_key, 'section_performance');

        if (class_exists('Tribe__Events__API')) {

            add_option('ax_event_cal_delayed_creation', '', '', false);
            register_setting(self::axip_performance_settings_key, 'ax_event_cal_delayed_creation');
            add_settings_field('ax_event_cal_delayed_creation', __('Events Calendar - Split API Calls and Event Creation:', 'axip'), array(
                &$this,
                'field_event_cal_delayed_creation',
            ), self::axip_performance_settings_key, 'section_performance');
        }

        add_option('ax_new_db_tables', '', '', false);
        register_setting(self::axip_performance_settings_key, 'ax_new_db_tables');
        add_settings_field('ax_new_db_tables', __('Use New DB Tables', 'axip'), array(
            &$this,
            'field_ax_new_db_tables',
        ), self::axip_performance_settings_key, 'section_performance');

        add_option('ax_debug_email_enable', '', '', false);
        register_setting(self::axip_performance_settings_key, 'ax_debug_email_enable');
        add_settings_field('ax_debug_email_enable', __('Debug Email Enabled', 'axip'), array(
            &$this,
            'field_ax_debug_email_enable',
        ), self::axip_performance_settings_key, 'section_performance');

        add_option('ax_debug_email', '', '', false);
        register_setting(self::axip_performance_settings_key, 'ax_debug_email');
        add_settings_field('ax_debug_email', __('Debug email', 'axip'), array(
            &$this,
            'field_ax_debug_email',
        ), self::axip_performance_settings_key, 'section_performance');

    }

    public function field_resumption_performance()
    {
        $optVal = get_option('ax_resumption_performance');
        $optActive = !empty($optVal);

        if (!$optActive) {
            $optVal = "performance_enabled";
            update_option('ax_resumption_performance', $optVal, false);
        }
        $options = array(
            "performance_enabled" => "Performance Mode enabled",
            "no_limit" => "Unlimited Enrolments",
        );
        echo '<select name="ax_resumption_performance">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>Limits the maximum number of enrolments checked (Enrolment Resumption and Post Enrolment) each cycle to the last 100 entered.</em></p>';
        echo '<p><em>Recommended if using shared hardware, or if 48 hr enrolment volume exceeds 100.</em></p>';

    }

    public function field_caching_enabled()
    {
        $optVal = get_option('ax_caching_enabled');
        $optActive = !empty($optVal);

        if (!$optActive) {
            $optVal = "caching_enabled";
            update_option('ax_caching_enabled', $optVal, false);
        }
        $options = array(
            "caching_enabled" => "Caching enabled",
            "no_limit" => "No Caching",
        );
        echo '<select name="ax_caching_enabled">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>Caches regularly used - but not regularly updated data for 10min.</em></p>';
        echo '<p><em>Data includes Course Lists, contact sources, venues, locations and similar data.</em></p>';

    }

    public function field_event_cal_delayed_creation()
    {

        $optVal = get_option('ax_event_cal_delayed_creation');
        $optActive = !empty($optVal);

        if (!$optActive) {
            $optVal = "enabled";
            update_option('ax_event_cal_delayed_creation', $optVal, false);
        }
        $options = array(
            "enabled" => "Delay Creation",
            "disabled" => "Create With API Call",
        );
        echo '<select name="ax_event_cal_delayed_creation">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>Separates the event creation from API calls to smooth out the performance impact of Events Calendar updates and also breaks up event creation into blocks of 20 instances.</em></p>';
        echo '<p><em>Will reduce the liklihood of hitting "Entry Processes" caps on shared hosting or slowdown from bulk event creation.</em></p>';

    }
    public function field_ax_new_db_tables()
    {
        $optVal = get_option('ax_new_db_tables');
        $optActive = !empty($optVal);

        if (!$optActive) {
            $optVal = "enabled";
            update_option('ax_new_db_tables', $optVal, false);
        }
        $options = array(
            "enabled" => "Use the new tables",
            "disabled" => "Use wp_transients",
        );
        echo '<select name="ax_new_db_tables">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>To prevent issues where Wordpress, or another plugin, deletes transient data early, new tables were added in 2.9.10 to store session data and enrolment resumption information.</em></p>';
        echo '<p><em>Enabling this setting makes use of the tables, but requires that the WP update function can create new tables. If it cannot, due to permissions or other issues, this setting will revert.</em></p>';
    }

    public function field_ax_shutdown_error_logs()
    {
        $optVal = get_option('ax_shutdown_error_logs');
        $optActive = !empty($optVal);

        if (!$optActive) {
            $optVal = "enabled";
            update_option('ax_shutdown_error_logs', $optVal, false);
        }
        $options = array(
            "enabled" => "Send Debug Emails",
            "disabled" => "No .Emails",
        );
        echo '<select name="ax_shutdown_error_logs">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>Note This will send an email with error details for any error or warning found found (in PHP)..</em></p>';
        echo '<p><em>This will log for errors not in the plugin code</em></p>';
    }

    public function field_ax_debug_email()
    {
        $optVal = get_option('ax_debug_email', '');
        $optActive = !empty($optVal);

        if ($optActive) {
            if (!filter_var($optVal, FILTER_VALIDATE_EMAIL)) {
                update_option('ax_debug_email', '', false);
                $optVal = '';
            }
        }

        echo '<input name="ax_debug_email" type="text" value="' . $optVal . '">';

        echo '<p><em>This email will be used to report some setup if they are found</em></p>';

    }

    public function field_ax_debug_email_enable()
    {

        $optVal = get_option('ax_debug_email_enable');

        if (empty($optVal)) {
            $optVal = "disabled";
            update_option('ax_debug_email_enable', $optVal, false);
        }
        $options = array(
            "enabled" => "Send Emails",
            "disabled" => "Do not send emails",
        );
        echo '<select name="ax_debug_email_enable">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';

    }
    public function section_performance_desc()
    {
        echo '<p>Settings to assist with performance and reducing API requests.</p>';
    }

}
