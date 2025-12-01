<?php

/**
 * Enrolment Service
 */

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die();

class AX_Database
{

    public static function registerEventHooks()
    {
        add_action('ax_transient_cleanup', array('AX_Database', 'clean_expired_transients'));
    }

    public static function setup_tables()
    {
        $dbTableVersion = get_option('ax_table_version', 0);
        $thisTableVersion = "1.2";
        global $wpdb;
        $table_name = $wpdb->prefix . "ax_enrolments";
        if ($dbTableVersion !== $thisTableVersion) {

            // Updating to prevent this running every time.
            update_option('ax_table_version', $thisTableVersion, false);

            $charset_collate = $wpdb->get_charset_collate();

            $sql = "CREATE TABLE $table_name (
                    id mediumint(9) NOT NULL AUTO_INCREMENT,
                    option_name varchar(191) NOT NULL UNIQUE DEFAULT '',
                    option_value longtext NOT NULL,
                    time datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    expiry datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    type varchar(10) DEFAULT 'legacy',
                    PRIMARY KEY  (id)
                ) $charset_collate;";

            require_once ABSPATH . 'wp-admin/includes/upgrade.php';
            dbDelta($sql);

            if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {

                self::report_db_error(true);

            } else {
                error_log(print_r($table_name . " created", true));
            }

            // Re-enable tables if they have previously thrown an error. This should fix any case where migration and read happened simultaneously.3
            $tablesDisabled = get_option('ax_new_db_tables', 'enabled') === 'disabled';
            if ($tablesDisabled) {
                $table_cols = $wpdb->get_col(
                    "DESC {$table_name}"
                );
                $colsFound = 0;
                foreach ($table_cols as $key => $value) {
                    switch ($value) {
                        case 'id':
                        case 'option_name':
                        case 'option_value':
                        case 'time':
                        case 'expiry':
                        case 'type':
                            $colsFound += 1;
                            break;

                        default:

                            break;
                    }
                }
                if ($colsFound === 6) {
                    update_option('ax_new_db_tables', 'enabled');
                }
            }
        }

    }

    public static function report_db_error($create = false, $errorDetail = "")
    {
        try {
            $debugEmail = get_option('ax_debug_email', '');
            $sendEmail = get_option('ax_debug_email_enable') === 'enabled';
            if (!$sendEmail) {
                return;
            }

            $sent = get_transient('db_email_sent', 'not_sent') === 'sent';
            if (!$create || $create && !$sent) {

                $table_name = $wpdb->prefix . "ax_enrolments";

                $subject = $create ? 'Error Creating DB Tables' : 'Database Error Found';
                $message = 'Could not create the ' . $table_name . ' table for site ' . get_site_url() . '. Please ensure that your WP Instance has been set up to be able to create and update database tables.</p>';
                if (!$create) {
                    $message = 'A database error was identified on site: ' . get_site_url() . '. ' . $errorDetail;
                }
                try {
                    wp_mail(empty($debugEmail) ? Axcelerate_Integration_Plugin::DEBUGEMAIL : $debugEmail, $subject, $message);
                } catch (\Throwable $th) {
                    error_log(print_r($th, true));
                }
                if ($create) {
                    set_transient('db_email_sent', 'sent', empty($debugEmail) ? 10 : 1 * DAY_IN_SECONDS);
                }

            }
        } catch (\Throwable $th) {
            error_log(print_r($th, true));
        }

    }

    public static function tables_exist()
    {
        global $wpdb;

        $table_name = $wpdb->prefix . "ax_enrolments";
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name) {
            return true;
        } else {
            return false;
        }
    }

    public static function set_transient($option_name, $option_value, $expiry = 600, $type = 'other')
    {

        $optVal = get_option('ax_new_db_tables', 'enabled');
        if ($optVal === 'disabled') {

            return set_transient($option_name, $option_value, $expiry);
        } else if (!self::tables_exist()) {
            update_option('ax_new_db_tables', 'disabled', false);
            return set_transient($option_name, $option_value, $expiry);
        }

        global $wpdb;

        $table_name = $wpdb->prefix . "ax_enrolments";

        $option_name = trim($option_name);

        if (empty($option_name)) {
            return false;
        }
        $serialized_value = maybe_serialize($option_value);
        $result = $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO $table_name
                    (`option_name`, `option_value`, `time`, `expiry`, `type`)
                VALUES (%s, %s,  NOW(), DATE_ADD(NOW(), INTERVAL %s SECOND), %s)
                ON DUPLICATE KEY UPDATE
                    `option_name` = VALUES(`option_name`),
                    `option_value` = VALUES(`option_value`),
                    `time` = VALUES(`time`),
                    `expiry` = VALUES(`expiry`),
                    `type` = VALUES(`type`)",
                $option_name,
                $serialized_value,
                $expiry,
                $type
            )
        );

        if (!empty($wpdb->last_error)) {
            error_log(print_r($wpdb->last_error, true));
            self::report_db_error(false, print_r($wpdb->last_error, true));
            update_option('ax_new_db_tables', 'disabled');
            return set_transient($option_name, $option_value, $expiry);
        }

    }
    public static function get_transient($option_name, $value = false)
    {

        $optVal = get_option('ax_new_db_tables', 'enabled');
        if ($optVal === 'disabled') {

            return get_transient($option_name, $value);
        } else if (!self::tables_exist()) {

            update_option('ax_new_db_tables', 'disabled');
            return get_transient($option_name, $value);
        }
        global $wpdb;

        $table_name = $wpdb->prefix . "ax_enrolments";
        $defaultValue = $value;

        if (!wp_installing()) {
            // get non expired values. Note: legacy is for supporting old non-expiry records.
            $row = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT option_value
                     FROM $table_name
                     WHERE option_name = %s
                     AND (
                        expiry > NOW()
                        OR (
                                type = 'legacy'
                                AND expiry > DATE_SUB(NOW(), INTERVAL 5 DAY)
                            )
                    )
                    LIMIT 1",
                    $option_name
                )
            );
            if (is_object($row)) {
                $value = $row->option_value;
            } else {
                // Row has expired. Clean up.
                $row = $wpdb->get_row(
                    $wpdb->prepare(
                        "SELECT id
                         FROM $table_name
                         WHERE option_name = %s
                         LIMIT 1",
                        $option_name
                    )
                );
                if (is_object($row)) {
                    $wpdb->delete($table_name, array('id' => $row->id));
                }
            }

            if (!empty($wpdb->last_error)) {
                error_log(print_r($wpdb->last_error, true));
                self::report_db_error(false, print_r($wpdb->last_error, true));
                update_option('ax_new_db_tables', 'disabled');
                return get_transient($option_name, $value);
            }

        }

        // Support for migration from wp transients
        if (empty($value)) {
            $oldTransient = get_transient($option_name);
            if (!empty($oldTransient)) {
                return $oldTransient;
            } else {
                return $defaultValue;
            }

        }

        return apply_filters("option_{$option_name}", maybe_unserialize($value), $option_name);

    }

    public static function delete_transient($option_name)
    {
        global $wpdb;

        $table_name = $wpdb->prefix . "ax_enrolments";

        return $wpdb->delete($table_name, array('option_name' => $option_name));

    }

    public static function get_bulk_transient_type($type = 'enrol', $limit = 500)
    {

        $optVal = get_option('ax_new_db_tables', 'enabled');
        if ($optVal === 'disabled') {
            return array();
        } else if (!self::tables_exist()) {

            update_option('ax_new_db_tables', 'disabled');
            return array();
        }

        global $wpdb;

        $table_name = $wpdb->prefix . "ax_enrolments";

        $results = array();

        // For enrol type, check legacy data as well for migration.
        if ($type === 'enrol') {
            $results = $wpdb->get_results($wpdb->prepare(
                "SELECT `option_name` AS `name`, `option_value` AS `value`, `type`
                FROM  $table_name
                WHERE `type` = %s
                OR (
                    `type`= 'legacy'
                    AND `option_name`
                    LIKE 'ax_enrol%'
                    AND `option_name` NOT LIKE 'ax_enrol_session%'
                )
                ORDER BY `id` DESC
                LIMIT %d
                ",
                $type,
                $limit
            ));

        } else {
            $results = $wpdb->get_results($wpdb->prepare(
                "SELECT `option_name` AS `name`, `option_value` AS `value`
                FROM  $table_name
                WHERE `type` = %s
                ORDER BY `id` DESC
                LIMIT %d
                ",
                $type,
                $limit
            ));

        }
        if (!empty($wpdb->last_error)) {
            error_log(print_r($wpdb->last_error, true));
            self::report_db_error(false, print_r($wpdb->last_error, true));
            update_option('ax_new_db_tables', 'disabled');
            return array();
        }

        return $results;
    }

    public static function get_bulk_transient_name($name = 'ax_enrol', $limit = 500)
    {

        $optVal = get_option('ax_new_db_tables', 'enabled');
        if ($optVal === 'disabled') {
            return array();
        } else if (!self::tables_exist()) {
            update_option('ax_new_db_tables', 'disabled');
            return array();
        }

        global $wpdb;

        $table_name = $wpdb->prefix . "ax_enrolments";

        $results = array();

        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT `option_name` AS `name`, `option_value` AS `value`, `type`
            FROM  $table_name
            WHERE `option_name` LIKE %s

            ORDER BY `id` DESC
            LIMIT %d
            ",
            "%" . $name . "%",
            $limit
        ));

        if (!empty($wpdb->last_error)) {
            error_log(print_r($wpdb->last_error, true));
            self::report_db_error(false, print_r($wpdb->last_error, true));
            update_option('ax_new_db_tables', 'disabled');
            return array();
        }

        return $results;
    }

    /**
     * Clean up transient values that are greater than:
     * 5 days expired (non-legacy)
     * 10 days expired (legacy)
     */
    public static function clean_expired_transients()
    {
        global $wpdb;

        $table_name = $wpdb->prefix . "ax_enrolments";

        if (!wp_installing() && self::tables_exist()) {
            $deleted = $wpdb->query(
                "DELETE FROM $table_name
                 WHERE (type <> 'legacy' AND expiry < DATE_SUB(NOW(), INTERVAL 5 DAY))
                    OR (type = 'legacy' AND expiry < DATE_SUB(NOW(), INTERVAL 10 DAY))
               "
            );
        }

    }

    public static function clear_option_autoload()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . "options";
        if (!wp_installing()) {
            try {
                $updated = $wpdb->query(
                    "UPDATE $table_name
                    SET autoload = 'no'
                    WHERE (
                        option_name LIKE 'ax_%'
                        OR option_name like 'axip_%'
                        OR option_name like '_transient_ax_%'
                    )
                    AND option_name <> 'ax_plugin_version'"
                );
            } catch (\Throwable $th) {
                error_log('Unable to disable option autoload');
            }
        }
    }
}
