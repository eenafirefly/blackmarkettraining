<?php

/**
 * Enrolment Service
 */

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */

/**
 * Enrolments for Enrolment Resumption.
 *
 * @author Rob Bisson <rob.bisson@axcelerate.com.au>
 */
class AX_Enrolments
{

    /**
     * Constructor
     *
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public function __construct()
    {
        add_action('init', 'AX_Enrolments::register_ajax_actions');
        add_action('init', 'AX_Enrolments::register_webhooks');
        add_action('init', 'AX_Enrolments::setup_tables');
    }
    public static function register_ajax_actions()
    {

        add_action('wp_ajax_send_reminder_by_reference', 'AX_Enrolments::ajax_send_reminders_reference_lookup');
        add_action('wp_ajax_nopriv_send_reminder_by_reference', 'AX_Enrolments::ajax_send_reminders_reference_lookup');

        add_action('wp_ajax_has_enrolment_by_reference', 'AX_Enrolments::ajax_has_existing_enrolment');
        add_action('wp_ajax_nopriv_has_enrolment_by_reference', 'AX_Enrolments::ajax_has_existing_enrolment');

        add_action('wp_ajax_flag_others_redundant_by_reference', 'AX_Enrolments::ajax_flag_others_redundant');
        add_action('wp_ajax_nopriv_flag_others_redundant_by_reference', 'AX_Enrolments::ajax_flag_others_redundant');

    }

    public static function get_enrolment($enrolmentID = '')
    {
        $enrolmentID = str_replace('_transient_', '', $enrolmentID);
        $enrolmentID = str_replace('ax_enrol_', '', $enrolmentID);

        $option = 'ax_enrol_' . $enrolmentID;
        $enrolment = AX_Database::get_transient($option);

        return $enrolment;
    }

    public static function set_or_update_enrolment($enrolmentHash, $enrolmentData)
    {
        $existing = self::getEnrolmentByID($enrolmentHash);
        if (!empty($existing)) {
            $merged = array_merge($existing, $enrolmentData);

            AX_Database::set_transient('ax_enrol_' . $enrolmentHash, $merged, 5 * DAY_IN_SECONDS, 'enrol');
        } else {
            AX_Database::set_transient('ax_enrol_' . $enrolmentHash, $enrolmentData, 5 * DAY_IN_SECONDS, 'enrol');
        }
    }

    public static function set_enrolment($transientRef = "", $enrolmentData = array(), $type = 'other')
    {
        return AX_Database::set_transient($transientRef, $enrolmentData, 5 * DAY_IN_SECONDS, 'enrol');
    }
    public static function register_webhooks()
    {

        add_action(
            'rest_api_init', function () {
                register_rest_route(
                    'axcelerate/v1',
                    'confirm_enrolment',
                    array(
                        'methods' => 'POST',
                        'callback' => 'AX_Enrolments::webhook_confirm_enrolment',
                        'permission_callback' => '__return_true',
                    )
                );
            }
        );

        add_action(
            'rest_api_init', function () {
                register_rest_route(
                    'axcelerate/v1',
                    'send_reminder',
                    array(
                        'methods' => 'POST',
                        'callback' => 'AX_Enrolments::send_reminder_webhook',
                        'permission_callback' => '__return_true',
                    )
                );
            }
        );

        /*     add_action(
    'setted_transient',
    'AX_Enrolments::setted_transient', 10, 3
    ); */

    }

    public static function setted_transient($transient, $value, $expiration)
    {
        // deprecated
        if ($transient) {
            if (strpos($transient, 'ax_enrol_session') !== false) {
                self::set_enrolment($transient, $value, 'session');
            } else if (strpos($transient, 'ax_enrol_') !== false) {
                self::set_enrolment($transient, $value, 'enrol');
            } else if (strpos($transient, 'ax_post_enrol_') !== false) {
                self::set_enrolment($transient, $value, 'post_enrol');
            }
        }
    }

    /**
     * WP Events hook
     *
     * @return void
     */
    public static function registerEventHooks()
    {
        add_action('ax_send_enrolment_reminders', array('AX_Enrolments', 'sendReminders'));
    }
    /**
     * WP Cron events.
     *
     * @return void
     */
    public static function setupReminderTasks()
    {
        wp_clear_scheduled_hook('ax_send_enrolment_reminders');

        if (!wp_next_scheduled('ax_send_enrolment_reminders')) {
            wp_schedule_event(time() + (2), '2_hourly', 'ax_send_enrolment_reminders');
        }
    }
    /**
     * ClearReminderTasks
     *
     * @return void
     */
    public static function clearReminderTasks()
    {
        wp_clear_scheduled_hook('ax_send_enrolment_reminders');
    }

    /**
     * Get all Enrolments currently in the DB, with name and value
     *
     * @return void
     * @author Rob Bisson<rob.bisson@axcelerate.com.au>
     */
    public static function getEnrolments()
    {
        global $wpdb;
        /* in performance mode limit to the most recent 100 enrolments*/
        $performance = constant('AXIP_ER_PERFORMANCE_ENABLED') === true;

        if ($performance) {
            $sql = "SELECT `option_name` AS `name`, `option_value` AS `value`
			FROM  $wpdb->options
			WHERE `option_name` LIKE '%transient_ax_enrol%'
			ORDER BY `option_id` DESC
			LIMIT 200";
        } else {
            $sql = "SELECT `option_name` AS `name`, `option_value` AS `value`
			FROM  $wpdb->options
			WHERE `option_name` LIKE '%transient_ax_enrol%'";
        }

        $results = $wpdb->get_results($sql);

        if ($performance) {
            $newTransient = AX_Database::get_bulk_transient_type('enrol', 100);
            $results = array_merge($newTransient, $results);
        } else {
            $newTransient = AX_Database::get_bulk_transient_type('enrol');
            $results = array_merge($newTransient, $results);
        }

        return $results;
    }

    public static function store_enrolment_hash_reference($enrolmentHash, $contactID, $instanceID, $courseType)
    {

        $enrolmentRef = 'ax_ref_' . $contactID . '_' . $instanceID . '_' . $courseType;

        $existing = self::get_enrolment_hash_reference($enrolmentRef);
        if (is_array($existing)) {
            $length = count($existing);
            $found = false;
            if ($length > 0) {
                foreach ($existing as $enrolment) {

                    if ($enrolment['enrolment_hash'] === $enrolmentHash) {
                        $found = true;
                    }
                }
            }
            if (!$found) {
                array_push($existing, array(
                    "enrolment_hash" => $enrolmentHash,
                    "time" => current_time('mysql'),
                ));
            }
            AX_Database::set_transient($enrolmentRef, $existing, 5 * DAY_IN_SECONDS, 'enrol_ref');
        } else {
            AX_Database::set_transient($enrolmentRef, array(array(
                "enrolment_hash" => $enrolmentHash,
                "time" => current_time('mysql'),
            )), 5 * DAY_IN_SECONDS, 'enrol_ref');
        }
    }

    public static function ajax_send_reminders_reference_lookup()
    {
        $contactID = $_REQUEST['contact_id'];
        $instanceID = $_REQUEST['instance_id'];
        $courseType = $_REQUEST['course_type'];
        $enrolmentHash;
        if (isset($_REQUEST['enrolment_hash'])) {
            $enrolmentHash = $_REQUEST['enrolment_hash'];
        }

        if (!empty($contactID) && !empty($instanceID) && !empty($courseType)) {
            $existingEnrolments = self::lookup_existing_enrolments($contactID, $instanceID, $courseType);
            if (is_array($existingEnrolments)) {
                $invoiced = array();
                $toRemind = array();
                foreach ($existingEnrolments as $enrolment) {

                    if (key_exists('invoice_id', $enrolment)) {
                        if (!empty($enrolment['invoice_id'])) {
                            array_push($invoiced, $enrolment);
                        }
                    }
                    if (isset($enrolmentHash) && !empty($enrolmentHash)) {
                        // send reminder for the following!
                        // this check is mainly to ensure that "completed" and similar enrolments are not sent.
                        if ($enrolment['enrolment_hash'] !== $enrolmentHash) {
                            if (key_exists('method', $enrolment)) {
                                switch ($enrolment['method']) {
                                    case 'initial':
                                    case 'epayment':
                                    case 'payment-attempt':
                                    case 'payment_flow':
                                        array_push($toRemind, $enrolment['enrolment_hash']);
                                        break;

                                    default:
                                        # code...
                                        break;
                                }
                            } elseif (key_exists('enrolments', $enrolment)) {
                                array_push($toRemind, $enrolment['enrolment_hash']);
                            }
                            // if not in the enrolments state, or method state, there's no point in "resuming" so don't send
                        }
                        // if the enrolment hash is equal then it's already active.

                    } else {
                        if (key_exists('method', $enrolment)) {
                            if ($enrolment['method'] == 'initial') {
                                array_push($toRemind, $enrolment['enrolment_hash']);
                            } elseif ($enrolment['method'] == 'epayment') {
                                array_push($toRemind, $enrolment['enrolment_hash']);
                            }
                        } elseif (key_exists('enrolments', $enrolment)) {
                            array_push($toRemind, $enrolment['enrolment_hash']);
                        }
                        // if not in the enrolments state, or method state, there's no point in "resuming" so don't send

                    }
                }

                if (count($invoiced) == 1) {
                    self::sendReminder($invoiced[0]['enrolment_hash']);
                } else {
                    foreach ($toRemind as $enrolmentHash) {
                        self::sendReminder($enrolmentHash);
                    }
                }
            }
        }
        echo json_encode(array('reminders_sent' => true));
        die();
    }

    public static function ajax_has_existing_enrolment()
    {
        $contactID = $_REQUEST['contact_id'];
        $instanceID = $_REQUEST['instance_id'];
        $courseType = $_REQUEST['course_type'];
        $enrolmentHash;
        if (isset($_REQUEST['enrolment_hash'])) {
            $enrolmentHash = $_REQUEST['enrolment_hash'];
        }

        if (!empty($contactID) && !empty($instanceID) && !empty($courseType)) {
            // find the enrolments
            // 6a86e3e8976a4aa45c786d66be7f7c46
            // 11992822
            $existingEnrolments = self::lookup_existing_enrolments($contactID, $instanceID, $courseType);

            if (is_array($existingEnrolments)) {
                if (count($existingEnrolments) > 0) {

                    $notSame = false;
                    $invoiced = array();
                    // check to see what state enrolments are in
                    // if enrolment hash is passed check for different enrolment attempts.
                    foreach ($existingEnrolments as $enrolment) {
                        $enrolmentIsForContact = true;
                        if (key_exists('enrolments', $enrolment)) {
                            $contactIDFound = false;
                            foreach ($enrolment['enrolments'] as $enrolContactID => $enrolObj) {
                                if ($enrolContactID == $contactID) {
                                    $contactIDFound = true;
                                }
                            }
                            if (!$contactIDFound) {
                                $enrolmentIsForContact = false;
                            }
                        }
                        if ($enrolmentIsForContact) {
                            if (key_exists('invoice_id', $enrolment)) {
                                if ($enrolment['invoice_id'] !== 0 && $enrolment['invoice_id'] !== "0") {
                                    array_push($invoiced, $enrolment);
                                }
                            }
                            if (!empty($enrolmentHash)) {
                                if ($enrolment['enrolment_hash'] !== $enrolmentHash) {

                                    if (key_exists('method', $enrolment)) {

                                        switch ($enrolment['method']) {
                                            case 'initial':
                                            case 'epayment':
                                            case 'payment-attempt':
                                            case 'payment_flow':
                                                $notSame = true;
                                                break;

                                            default:
                                                # code...
                                                break;
                                        }
                                    } elseif (key_exists('enrolments', $enrolment)) {
                                        $notSame = true;
                                    } else {
                                        $enrolment['redundant'] = true;
                                        // flag it so it will get skipped in resumption checks.
                                        self::updateEnrolmentWithoutRefresh($enrolment['enrolment_hash'], $enrolment);
                                    }
                                }
                            }
                        }
                    }

                    if (!empty($enrolmentHash)) {
                        if ($notSame) {
                            if (count($invoiced) > 0) {
                                echo json_encode(array("enrolments" => true, 'has_invoice' => true));
                                die();
                            } else {
                                echo json_encode(array("enrolments" => true));
                                die();
                            }

                        }
                    } else {
                        if (count($invoiced) > 0) {
                            echo json_encode(array("enrolments" => true, 'has_invoice' => true));
                            die();
                        } else {
                            echo json_encode(array("enrolments" => true));
                            die();
                        }
                    }
                }
            }
        }

        echo json_encode(array("enrolments" => false));
        die();

    }
    /**
     * Function to find any other enrolment records, and flag them as "redundant"
     * This will prevent notifications going out.
     *
     * Only flags them if the user is the same as the user on the enrolment record.
     *
     * @return void
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function ajax_flag_others_redundant()
    {
        $contactID = $_REQUEST['contact_id'];
        $userContactID = $_REQUEST['user_contact_id'];
        $instanceID = $_REQUEST['instance_id'];
        $courseType = $_REQUEST['course_type'];
        $enrolmentHash;
        if (isset($_REQUEST['enrolment_hash'])) {
            $enrolmentHash = $_REQUEST['enrolment_hash'];
        }
        if (!empty($contactID) && !empty($instanceID) && !empty($courseType)) {
            // find the enrolments
            $existingEnrolments = self::lookup_existing_enrolments($contactID, $instanceID, $courseType);
            foreach ($existingEnrolments as $enrolment) {
                if ($enrolment['enrolment_hash'] !== $enrolmentHash) {
                    if ($enrolment['user_contact_id'] . "" !== $userContactID . "") {
                        //if method exists don't flag it, as enrolment will be broken.
                        if (!key_exists('method', $enrolment)) {
                            $enrolment['redundant'] = true;
                            self::updateEnrolmentWithoutRefresh($enrolment['enrolment_hash'], $enrolment);
                        }

                    }
                }
            }

        }
        echo json_encode(array("done" => false));
        die();

    }

    public static function lookup_existing_enrolments($contactID, $instanceID, $courseType)
    {
        $enrolments = self::lookup_enrolment_hash($contactID, $instanceID, $courseType);

        if (!empty($enrolments)) {

            $fullEnrolments = array();
            foreach ($enrolments as $enrolment) {
                $fullE = self::getEnrolmentByID($enrolment['enrolment_hash']);

                if (!empty($fullE)) {
                    if (!key_exists('redundant', $fullE)) {
                        if (!key_exists('method', $fullE)) {
                            array_push($fullEnrolments, $fullE);
                        } elseif (key_exists('method', $fullE)) {
                            switch ($fullE['method']) {
                                case 'initial':
                                case 'epayment':
                                case 'payment-attempt':
                                case 'payment_flow':
                                    array_push($fullEnrolments, $fullE);
                                    break;
                                default:
                                    break;
                            }
                        } elseif (key_exists('enrolments', $fullE)) {
                            array_push($fullEnrolments, $fullE);
                        } elseif (!key_exists('is_enquiry', $fullE)) {
                            array_push($fullEnrolments, $fullE);
                        }
                    }

                }
            }

            if (count($fullEnrolments) > 0) {
                return $fullEnrolments;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    public static function lookup_enrolment_hash($contactID, $instanceID, $courseType)
    {
        $enrolmentRef = 'ax_ref_' . $contactID . '_' . $instanceID . '_' . $courseType;
        if (!empty($contactID) && !empty($instanceID) && !empty($courseType)) {
            return self::get_enrolment_hash_reference($enrolmentRef);
        }
        return null;

    }

    public static function get_enrolment_hash_reference($enrolmentReference)
    {
        $enrolments = AX_Database::get_transient($enrolmentReference);

        if (is_array($enrolments)) {
            if (!empty($enrolments[0])) {
                return $enrolments;
            }
        }
        return array();
    }
    /**
     * Get enrolment transient either by transient name, or full option string
     * Returns Null if expired or not found.
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     *
     * @param string $enrolmentID - Enrolment hash to retrieve
     * @return void
     *
     */
    public static function getEnrolmentByID($enrolmentID = '')
    {

        if (!empty($enrolmentID)) {
            /*clean any extra values to ensure that the ID is correct*/
            $enrolmentID = str_replace('_transient_', '', $enrolmentID);
            $enrolmentID = str_replace('ax_enrol_', '', $enrolmentID);

            $enrolment = self::get_enrolment($enrolmentID);

            if ($enrolment) {
                /*add enrolment hash in case it isn't present*/
                $enrolment['enrolment_hash'] = $enrolmentID;
                return $enrolment;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
    /**
     * Process Enrolment data and retrieve a contact list.
     * @param array $enrolmentData
     * @return boolean
     */
    public static function getEnrolmentContactList($enrolmentData = array())
    {
        if (!empty($enrolmentData)) {
            $contactList = array();
            if (!empty($enrolmentData['enrolments'])) {
                foreach ($enrolmentData['enrolments'] as $key => $value) {
                    $contact = array(
                        'CONTACTID' => $key,
                        'GIVENNAME' => $value['CONTACT_NAME'],
                    );
                    array_push($contactList, $contact);
                }
            }
            return $contactList;
        } else {
            return false;
        }
    }

    /**
     * Update an existing valid enrolment transient withought refreshing the expiry date through update_option
     * Accepts enrolment ID in plain hash, hash + 'ax_enrol_' and the full option name
     * @param string $enrolmentID
     * @param array $data
     */
    public static function updateEnrolmentWithoutRefresh($enrolmentID = '', $data = array())
    {
        if (!empty($enrolmentID)) {
            /*clean any extra values to ensure that the ID is correct*/
            $enrolmentID = str_replace('_transient_', '', $enrolmentID);
            $enrolmentID = str_replace('ax_enrol_', '', $enrolmentID);

            update_option('_transient_ax_enrol_' . $enrolmentID, $data, false);
            self::set_enrolment("ax_enrol_" . $enrolmentID, $data, 'enrol');

        }
    }

    /**
     * This function will return still active (not timed out) Enrolments.
     * It will also clear the DB of any inactive enrolments.
     */
    public static function getActiveEnrolments()
    {
        $enrolments = self::getEnrolments();
        $ids = array();
        $active = array();
        foreach ($enrolments as $enrol) {
            $enrolment = self::getEnrolmentByID($enrol->name);
            // prevent duplicates;
            $found = in_array($enrol->name, $ids);
            if (!empty($enrolment) && !$found) {
                array_push($active, $enrolment);
                array_push($ids, $enrol->name);
            }
        }
        return $active;
    }

    /**
     * Filters the results down, eliminating any that have been "Confirmed"
     */
    public static function getIncompleteEnrolments()
    {
        $activeEnrolments = self::getActiveEnrolments();
        $filteredArray = array();

        if ($activeEnrolments) {
            foreach ($activeEnrolments as $enrolment) {

                if (!key_exists('redundant', $enrolment)) {
                    /*Eliminate any confirmations*/
                    if (key_exists('method', $enrolment)) {
                        /*Will need an alternative way to detect completion maybe*/
                        if ($enrolment['method'] == "initial") {
                            array_push($filteredArray, $enrolment);

                        }
                        if ($enrolment['method'] == "epayment") {
                            array_push($filteredArray, $enrolment);
                        }
                    } else {
                        /*prevent enquiries from being sent, and skip any enrolments that have been marked "redundant"*/
                        if (!key_exists('is_enquiry', $enrolment)) {

                            array_push($filteredArray, $enrolment);
                        }
                    }
                }

            }
        }

        return $filteredArray;
    }

    /**
     * Undocumented function
     *
     * @return void
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function enrolmentsToBeMailed()
    {
        $incompleteEnrolments = self::getIncompleteEnrolments();
        $filteredArray = array();
        if ($incompleteEnrolments) {
            foreach ($incompleteEnrolments as $enrolment) {
                /*Eliminate any confirmations*/
                if (!key_exists('mailed', $enrolment)) {
                    if (key_exists('time', $enrolment)) {
                        $time = $enrolment['time'];
                        $debugVal = get_option('ax_enrol_resumption_debug_mode');

                        if (!empty($debugVal)) {
                            array_push($filteredArray, $enrolment);
                        } else {
                            /*make sure that the enrolment was not updated in the last hour, ensure that the email is not sent mid enrolment*/
                            $time = strtotime($time);
                            $offsetTime = strtotime(current_time('mysql')) - 60 * 60;

                            if ($time < $offsetTime) {
                                array_push($filteredArray, $enrolment);
                            }
                        }
                    }
                }
            }
        }

        return $filteredArray;
    }

    public static function send_reminder_webhook()
    {
        if (key_exists('enrolment_hash', $_REQUEST)) {
            $enrolmentHash = $_REQUEST['enrolment_hash'];
            self::sendReminder($enrolmentHash);
            echo json_encode(array('reminder_sent' => true));
        } else {
            echo json_encode(array('error' => true, 'message' => 'No Enrolment Hash provided'));
        }
        die();
    }

    public static function getTemplateIDForEnrolment($enrolment = array())
    {

        $resumption_type = 'abandonment';
        if (key_exists('resumption_type', $enrolment)) {
            $resumption_type = $enrolment['resumption_type'];
        }

        $config = -1;
        if (key_exists('config', $enrolment)) {
            $config = intval($enrolment['config'], 10);
        } else if (key_exists('config_id', $enrolment)) {
            $config = intval($enrolment['config_id'], 10);
        }

        $default_template = intval(get_option('ax_enrol_resumption_template_id', 0), 10);
        $requested_template = intval(get_option('ax_enrol_resumption_template_id_requested', 0), 10);
        $verify_template = intval(get_option('ax_enrol_resumption_template_id_verify', 0), 10);

        if ($config !== -1) {
            $mapping_settings = get_option('ax_config_resumption_mapping_settings');
            $key = $config . '_' . $resumption_type;

            if (!empty($mapping_settings)) {
                $mapping_settings = json_decode($mapping_settings, true, 10);
                if (key_exists($key, $mapping_settings)) {
                    $templateID = $mapping_settings[$key]['template_id'];

                    if (!empty($templateID)) {
                        return intval($templateID);
                    }
                }
            }
        }

        if ($resumption_type === 'verify' && $verify_template !== 0) {

            return $verify_template;
        }
        if ($resumption_type === 'requested' && $requested_template !== 0) {
            return $requested_template;
        }
        return $default_template;
    }

    /**
     * Undocumented function
     *
     * @return void
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function sendReminders()
    {
        $reminders_enabled = get_option('ax_enrol_notifications_active');
        /*Reminders Enabled is either 0 or 1, so check to see if empty*/
        if (!empty($reminders_enabled)) {

            $enrolments = self::enrolmentsToBeMailed();

            if ($enrolments) {
                foreach ($enrolments as $enrolment) {
                    $enrolmentHash = $enrolment['enrolment_hash'];
                    $contactID = intval($enrolment['user_contact_id'], 10);

                    $templateID = self::getTemplateIDForEnrolment($enrolment);

                    if (!empty($templateID)) {
                        self::_sendReminderTemplate($enrolmentHash, $enrolment, $contactID, intval($templateID, 10));
                    } else {
                        self::_sendReminderNoTemplate($enrolmentHash, $enrolment, $contactID);
                    }
                }
            }
        }
    }

    /**
     * Send a single enrolment reminder
     *
     * @param string $enrolmentHash
     * @return void
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function sendReminder($enrolmentHash = "")
    {
        $enrolment = self::getEnrolmentByID($enrolmentHash);

        $templateID = self::getTemplateIDForEnrolment($enrolment);

        $contactID = intval($enrolment['user_contact_id'], 10);

        if (!empty($templateID)) {
            self::_sendReminderTemplate($enrolmentHash, $enrolment, $contactID, intval($templateID, 10));
        } else {
            self::_sendReminderNoTemplate($enrolmentHash, $enrolment, $contactID);
        }

    }

    /**
     * Undocumented function
     *
     * @param string $fullEnrolmentHash
     * @param integer $contactID
     * @param string $content
     * @return void
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    private static function _sendGeneratedTemplate($fullEnrolmentHash = '', $contactID = 0, $content = '')
    {
        $AxcelerateAPI = new AxcelerateAPI();

        $finalParams = array(
            'contactID' => $contactID,
            'content' => (string) $content,
            'subject' => 'Incomplete Online Booking',
        );

        $response = $AxcelerateAPI->callResource($finalParams, '/template/email', 'POST');

        self::_processReminderResponse($fullEnrolmentHash, $response);
    }

    /**
     *
     * @param string $fullEnrolmentHash
     * @param array $enrolment
     * @param number $contactID
     * @param number $templateID
     */
    private static function _sendReminderTemplate($fullEnrolmentHash = '', $enrolment = array(), $contactID = 0, $templateID = 0)
    {
        $AxcelerateAPI = new AxcelerateAPI();
        //Generate resumption link
        $resumeEnrolmentLink = $enrolment['page_url'];
        $args = parse_url($resumeEnrolmentLink, PHP_URL_QUERY);

        $resumptionHash = 'enrolment=' . $enrolment['enrolment_hash'];
        if (strpos($args, $resumptionHash) !== false) {
            $resumeEnrolmentLink = $resumeEnrolmentLink;
        } elseif (!empty($args)) {
            $resumeEnrolmentLink = $resumeEnrolmentLink . '&' . $resumptionHash;
        } else {
            $resumeEnrolmentLink = $resumeEnrolmentLink . '?' . $resumptionHash;
        }

        //Send template
        $replaceContent = json_encode(array('Online Enrolment Link' => $resumeEnrolmentLink));
        $params = array(
            'contactID' => $contactID,
            'planID' => $templateID,
            'replaceContent' => $replaceContent,
            'subject' => 'Incomplete Online Booking',
        );
        $response = $AxcelerateAPI->callResource($params, '/template/email', 'POST');
        $sendEmail = false;
        if ($response instanceof stdClass && !empty($response->error)) {
            if (true === WP_DEBUG) {
                try {
                    error_log(print_r(array('params' => $params, 'response' => $response), true));
                } catch (Exception $e) {
                    //
                }
            }
            $details = "";
            try {
                if (property_exists($response, "resultBody")) {
                    if (!empty($response->resultBody->DETAILS)) {
                        $details = $response->resultBody->DETAILS;
                    }
                }
            } catch (\Throwable $th) {
                error_log(print_r('Unexpected template error', true));
                error_log(print_r($response, true));
            }
            if (!empty($details) && strpos($details, 'planID') === false) {
                // The contact ID was the reason for failure. Don't try to send the email as it will error.
                error_log(print_r(array('params' => $params, 'response' => $response, 'sendEmail' => $sendEmail), true));
            } else {
                $sendEmail = true;
                /*use transient to deactivate the email notification if one has been sent in the last 2 hours*/
                $errorNotification = AX_Database::get_transient('ax_error_reminder_template');
                if (empty($errorNotification)) {
                    AX_Database::set_transient('ax_error_reminder_template', true, 2 * HOUR_IN_SECONDS, 'other');
                    $users = get_users('role=Administrator');
                    try {
                        wp_mail(
                            $users[0]->user_email,
                            'Enrolment Notification Template',
                            'Your Enrolment notification template is no longer available. Please review your Enrolment Resumption Settings'
                        );
                    } catch (\Throwable $th) {
                        //throw $th;
                    }
                }
            }
        }
        self::_processReminderResponse($fullEnrolmentHash, $response);
        if ($sendEmail) {
            self::_sendReminderNoTemplate($fullEnrolmentHash, $enrolment, $contactID);
        }
    }

    /**
     *
     * @param string $enrolmentHash
     * @param array $enrolment
     * @param number $contactID
     */
    private static function _sendReminderNoTemplate($enrolmentHash = '', $enrolment = array(), $contactID = 0)
    {
        $resumeEnrolmentLink = $enrolment['page_url'];
        $resumeEnrolmentLink = $enrolment['page_url'];
        $args = parse_url($resumeEnrolmentLink, PHP_URL_QUERY);

        $resumptionHash = 'enrolment=' . $enrolment['enrolment_hash'];
        if (strpos($args, $resumptionHash) !== false) {
            $resumeEnrolmentLink = $resumeEnrolmentLink;
        } elseif (!empty($args)) {
            $resumeEnrolmentLink = $resumeEnrolmentLink . '&' . $resumptionHash;
        } else {
            $resumeEnrolmentLink = $resumeEnrolmentLink . '?' . $resumptionHash;
        }

        $content = "<p>You have partially completed an enrolment via " . esc_url(home_url()) . ".</p>";
        $content = $content . "<p>You can resume your enrolment here " . esc_url($resumeEnrolmentLink) . "</p>";

        self::_sendGeneratedTemplate($enrolmentHash, $contactID, $content);
    }

    private static function _processReminderResponse($enrolmentHash = '', $response = '')
    {
        $debugVal = get_option('ax_enrol_resumption_debug_mode');
        if (!empty($debugVal)) {
            echo '<div class="notice notice-success is-dismissible"><h4>';

            var_dump($response);

            echo '</h4></div>';
        }
        if ($response instanceof stdClass && !empty($response->SUCCESSCOUNT)) {
            if ($response->SUCCESSCOUNT === 1) {
                $enrolment = self::getEnrolmentByID($enrolmentHash);
                $enrolment['mailed'] = true;
                self::updateEnrolmentWithoutRefresh($enrolmentHash, $enrolment);
            }
        }
    }

    public static function webhook_confirm_enrolment()
    {
        if (array_key_exists('enrolment_hash', $_REQUEST)) {
            $enrolmentHash = $_REQUEST['enrolment_hash'];
            $enrolment = self::getEnrolmentByID($enrolmentHash);

            if (!empty($enrolment)) {
                $enrolmentInfo = self::confirmEnrolment($enrolmentHash, true);
                if (empty($enrolmentInfo)) {
                    return rest_ensure_response(
                        new WP_Error('rest_invalid',
                            esc_html__('Enrolment not in valid state for confirmation', 'axcelerate'),
                            array('status' => 400, 'confirmed' => false, 'enrolment' => $enrolment, 'confirmations' => $enrolmentInfo)
                        )
                    );

                } else if (is_array($enrolmentInfo) && (key_exists('not_confirmed', $enrolmentInfo) || key_exists('error', $enrolmentInfo))) {
                    return rest_ensure_response(
                        new WP_Error('rest_invalid',
                            esc_html__('Enrolment found but not confirmed', 'axcelerate'),
                            array('status' => 400, 'confirmed' => false, 'confirmations' => $enrolmentInfo, 'enrolment' => $enrolment)
                        )
                    );

                } else {
                    return rest_ensure_response(array('confirmed' => true, 'confirmations' => $enrolmentInfo, 'enrolment' => $enrolmentHash));
                }
            } else {

                return rest_ensure_response(new WP_Error('rest_invalid', esc_html__('No matching enrolment found', 'axcelerate'), array('status' => 400)));

            }

        } else {
            return rest_ensure_response(new WP_Error('rest_invalid', esc_html__('Enrolment Hash is not present', 'axcelerate'), array('status' => 412)));

        }

        die();
    }

    public static function confirmEnrolment($enrolmentHash = "", $ignoreMethod = false)
    {
        //Enrolment widget stores enrolments in contact -> instances
        //Widget converts this to instance -> contacts for enrolment
        //likely that we can use contact -> instances here.
        if (!empty($enrolmentHash)) {
            $enrolmentData = self::getEnrolmentByID($enrolmentHash);

            if (!empty($enrolmentData)) {

                $suppress = key_exists('always_suppress_notifications', $enrolmentData) && !empty($enrolmentData['always_suppress_notifications']);

                if (key_exists('method', $enrolmentData)) {
                    $method = $enrolmentData['method'];
                    if ($method === 'confirmed') {

                        // build a data set listing all enrolments which were "confirmed previously"
                        $enrolmentsCompleted = array();
                        foreach ($enrolmentData['enrolments'] as $contactID => $instance) {
                            foreach ($instance as $instanceID => $enrolment) {
                                //skip the contact name object.
                                if ("CONTACT_NAME" !== $instanceID) {
                                    $enrolled = array(
                                        'contactID' => $enrolment['contactID'],
                                        'already_confirmed' => true,
                                        'instanceID' => $instanceID,
                                    );

                                    array_push($enrolmentsCompleted, $enrolled);
                                }

                            }
                        }
                        return $enrolmentsCompleted;
                    }
                    if ($ignoreMethod) {

                        $tentative_confirm = !empty($enrolmentData['tentative_confirm']);

                        $confirmed = self::_loopEnrolment($enrolmentData['enrolments'], $enrolmentData['invoice_id'], $tentative_confirm, $suppress);

                        if (!key_exists('error', $confirmed)) {

                            //Update the stored data - change method so that it will not trigger again.
                            $enrolmentData['method'] = "confirmed";
                            $enrolmentData['enrolment_complete'] = true;
                            self::updateEnrolmentWithoutRefresh($enrolmentHash, $enrolmentData);
                        }
                        return $confirmed;
                    } else if ('initial' == $method) {
                        //Why you going through here? You should be in the EW

                    } elseif ('epayment' == $method) {
                        $confirmed = self::_loopEnrolment($enrolmentData['enrolments'], $enrolmentData['invoice_id'], false, $suppress);

                        if (!key_exists('error', $confirmed)) {

                            //Update the stored data - change method so that it will not trigger again.
                            $enrolmentData['method'] = "confirmed";
                            $enrolmentData['enrolment_complete'] = true;
                            self::updateEnrolmentWithoutRefresh($enrolmentHash, $enrolmentData);
                        }
                        return $confirmed;
                    } elseif ('payment_flow' == $method) {
                        $tentative_confirm = !empty($enrolmentData['tentative_confirm']);

                        $log = array(
                            'enrolment_hash' => $enrolmentHash,
                            'tentative' => $tentative_confirm,
                        );
                        $confirmed = self::_loopEnrolment($enrolmentData['enrolments'], $enrolmentData['invoice_id'], $tentative_confirm, $suppress);

                        if (!key_exists('error', $confirmed)) {

                            //Update the stored data - change method so that it will not trigger again.
                            $enrolmentData['method'] = "confirmed";
                            $enrolmentData['enrolment_complete'] = true;
                            self::updateEnrolmentWithoutRefresh($enrolmentHash, $enrolmentData);
                        }
                        return $confirmed;
                    } else {
                        return array('not_confirmed' => true, 'invalid_method' => $enrolmentData['method']);
                    }
                }
            }
        }
        return null;
    }

    private static function _loopEnrolment($enrolmentList, $invoiceID, $tentative_confirm = false, $suppress_notice = false)
    {
        $error = false;
        $enrolmentsCompleted = array();
        $errors = array();
        //Loop over the list of contacts to grab the instance lists.
        foreach ($enrolmentList as $contactID => $instance) {
            //Loop over the instance lists to grab the individual enrolments.
            foreach ($instance as $instanceID => $enrolment) {
                //skip the contact name object.
                if ("CONTACT_NAME" !== $instanceID) {
                    $enrolled = self::_enrolIndividual($enrolment, $invoiceID, $tentative_confirm, $suppress_notice);
                    if (key_exists('error', $enrolled)) {
                        $error = true;
                        array_push($errors, $enrolled);
                    }
                    array_push($enrolmentsCompleted, $enrolled);
                }

            }

        }
        if (!empty($error)) {
            return array('error' => true, 'enrolments' => $enrolmentsCompleted, 'errors' => $errors);
        }
        return $enrolmentsCompleted;
        //TODO: update enrolment data!

    }

    private static function _enrolIndividual($enrolment, $invoiceID, $tentative_confirm, $suppress_notice)
    {
        $enrolment = (array) $enrolment;

        if (!empty($invoiceID)) {
            $enrolment['invoiceID'] = $invoiceID;
            $enrolment['generateInvoice'] = 1;
        }

        $enrolCopy = $enrolment;

        // if sendAdminNotification is set then block the next call.
        if (key_exists('sendAdminNotification', $enrolment)) {
            unset($enrolment['sendAdminNotification']);
            $enrolment['blockAdminNotification'] = true;
        }

        if (key_exists('suppressNotifications', $enrolment) && !$suppress_notice) {
            unset($enrolment['suppressNotifications']);
        } else if ($suppress_notice) {
            $enrolment['suppressNotifications'] = true;
            $enrolment['sendAdminNotification'] = true; // always send admin notice!
        }

        if ($tentative_confirm) {
            $enrolment['tentative'] = true;
        } else if (key_exists('tentative', $enrolment)) {
            unset($enrolment['tentative']);
        }

        if (key_exists('discountIDList', $enrolment)) {
            unset($enrolment['discountIDList']);
        }
        if(isset($enrolment['discountParams'])){
            unset($enrolment['discountParams']);
        }

        if (key_exists('cost', $enrolment)) {
            unset($enrolment['cost']);
        }
        if (key_exists('originalCost', $enrolment)) {
            unset($enrolment['originalCost']);
        }
        try {       
            unset($enrolment['NAME']);
            unset($enrolment['DATESDISPLAY']);
            unset($enrolment['COURSENAME']);
        } catch (Exception $e) {
            error_log(print_r($e, true));
        }
        $AxcelerateAPI = new AxcelerateAPI();

        //TODO: Should this first check the status of the enrolment in aX before attempting confirmation
        if ($enrolment['type'] !== 'el') {
            $existingEnrolment = $AxcelerateAPI->callResource(
                array(
                    'instanceID' => $enrolment['instanceID'],
                    'type' => $enrolment['type'],
                    'contactID' => $enrolment['contactID'],
                ),
                '/course/enrolments',
                'GET'
            );
            if ($existingEnrolment instanceof stdClass) {
                if (!empty($existingEnrolment->error)) {
                    $message = 'An error occurred';
                    if (!empty($existingEnrolment->resultBody)) {
                        if (!empty($existingEnrolment->resultBody->MESSAGES)) {
                            $message = $existingEnrolment->resultBody->MESSAGES;
                        }
                    }

                    return array(
                        'contactID' => $enrolment['contactID'],
                        'error' => true,
                        'message' => $message,
                        'instanceID' => $enrolment['instanceID'],
                    );
                }
            } else {
                if (!empty($existingEnrolment[0])) {
                    if (!empty($existingEnrolment[0]->CONTACTID)) {
                        $status = $existingEnrolment[0]->STATUS;
                        $status = strtolower($status);
                        $log = array(
                            'contact_id' => $existingEnrolment[0]->CONTACTID,
                            'status' => $status,

                        );

                        if (key_exists('tentative', $enrolment)) {
                            $log['tentative_enrolment'] = $enrolment['tentative'];
                        }

                        if ('tentative' !== $status) {

                            return array(
                                'contactID' => $enrolment['contactID'],
                                'already_enrolled' => true,
                                'instanceID' => $enrolment['instanceID'],
                            );
                        }
                    }
                }
            }
        }
        

        //error_log(print_r($enrolment, true));
        $Response = $AxcelerateAPI->callResource($enrolment, '/course/enrol', 'POST');
        //error_log(print_r($Response, true));
        if ($Response instanceof stdClass) {

            if (!empty($Response->error)) {
                $message = 'An error occurred';
                if (!empty($Response->resultBody)) {
                    if (!empty($Response->resultBody->MESSAGES)) {
                        $message = $Response->resultBody->MESSAGES;
                    }
                }
                return array(
                    'contactID' => $enrolment['contactID'],
                    'error' => true,
                    'message' => $message,
                    'instanceID' => $enrolment['instanceID'],
                    'original' => $enrolCopy,
                );

            } elseif (!empty($Response->CONTACTID)) {

                $noteDeets = array(
                    'noteCodeID' => 88,
                    'noteTypeID' => 88,
                    'contactID' => $enrolment['contactID'],

                );
                $noteDeets['contactNote'] = '<p>Course Enrolment - Confirmation</p>';
                $dateString = date_format(new DateTime(), 'd/m/Y H:i:s');

                $noteDeets['contactNote'] .= "<p>Time: <b>" . $dateString . "</b></p>";
                $noteDeets['contactNote'] .= "<p>Method: Confirmation</p>";
                $noteDeets['contactNote'] .= "<p>InstanceID: " . $enrolment['instanceID'] . "</p>";
                $noteDeets['contactNote'] .= "<p>Type: " . $enrolment['type'] . "</p>";
                $Note = $AxcelerateAPI->callResource($noteDeets, '/contact/note', 'POST');

                return array(
                    'contactID' => $Response->CONTACTID,
                    'response' => $Response,
                    'instanceID' => $enrolment['instanceID'],
                    'original' => $enrolCopy,
                );
            } else {
                error_log(print_r($Response, true));
            }
        }

    }
}
