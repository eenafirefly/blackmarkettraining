<?php

defined('ABSPATH') or die();

class AX_Payment_Flow
{

    public function __construct()
    {
        self::register_ajax_actions();
    }

    public static function register_ajax_actions()
    {
        add_action('wp_ajax_ax_payment_flow_form', 'AX_Payment_Flow::ajax_payment_flow_form');
        add_action('wp_ajax_nopriv_ax_payment_flow_form', 'AX_Payment_Flow::ajax_payment_flow_form');

        add_action('wp_ajax_ax_payment_plan_form', 'AX_Payment_Flow::ajax_payment_plan_form');
        add_action('wp_ajax_nopriv_ax_payment_plan_form', 'AX_Payment_Flow::ajax_payment_plan_form');

        add_action('wp_ajax_ax_payment_flow_begin', 'AX_Payment_Flow::ajax_payment_flow_begin');
        add_action('wp_ajax_nopriv_ax_payment_flow_begin', 'AX_Payment_Flow::ajax_payment_flow_begin');

        add_action('wp_ajax_ax_select_plan', 'AX_Payment_Flow::ajax_select_plan');
        add_action('wp_ajax_nopriv_ax_select_plan', 'AX_Payment_Flow::ajax_select_plan');

        add_action('wp_ajax_ax_payment_url', 'AX_Payment_Flow::ajax_payment_flow_url');
        add_action('wp_ajax_nopriv_ax_payment_url', 'AX_Payment_Flow::ajax_payment_flow_url');

    }

    public static function ajax_payment_flow_url()
    {
        $invoiceGUID = $_REQUEST['invoice_guid'];
        $enrolment_hash = $_REQUEST['enrolment_hash'];

        $redirectPostID = get_option('ax_enrol_event_redirect_url');
        $url = '';

        $provider = $_REQUEST['provider'];

        $payViaToken = isset($_REQUEST['pay_by_token']);

        if (!empty($redirectPostID)) {
            $url = esc_url(get_permalink($redirectPostID));
        }

        if (key_exists('config_id', $_REQUEST)) {

            $config_id = $_REQUEST['config_id'];

            $mapping_settings = get_option('ax_config_comp_mapping_settings');
            $mapped = json_decode($mapping_settings, true, 10);
            $config = "";
            try {
                if (!empty($mapped) && array_key_exists($_REQUEST['config_id'], $mapped)) {
                    $config = $mapped[$_REQUEST['config_id']];
                }

            } catch (\Throwable $th) {
                //throw $th;
            }

            if (!empty($config)) {
                $url = esc_url(get_permalink($config["PAGE_ID"]));
            }
        }

        $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);
        $enrolmentData['payment_flow'] = 'url_requested';

        $enrolmentData['payment_flow_data'] = array();
        $enrolmentData['payment_flow_data']['enrol_url'] = $_REQUEST['redirect_url'] . '?enrolment=' . $enrolment_hash;
        $enrolmentData['payment_flow_data']['ezypay_single'] = $provider === 'ezypay';
        $enrolmentData['payment_flow_data']['provider'] = $provider;
        // $enrolmentData['method'] = 'payment_flow';

        // not using method as it does not happen before the method executes.

        // need to "flag" the enrolment as having started this process

        $AxcelerateAPI = new AxcelerateAPI();

        $confirmURL = get_rest_url(null, 'axcelerate/v1/confirm_enrolment');

        $params = array(
            "reference" => $enrolment_hash,
            "invoiceGUID" => $invoiceGUID,
            "redirectURL" => $_REQUEST['redirect_url'] . '?enrolment=' . $enrolment_hash,
            "cancelURL" => $_REQUEST['redirect_url'] . '?enrolment=' . $enrolment_hash,
            'webhookURL' => $confirmURL . '?enrolment_hash=' . $enrolment_hash,
            'customerIP' => self::getUserIP(),
        );

        if ($payViaToken) {

            $params['tokenCustomer'] = true;
            $enrolmentData['pay_via_token'] = true;
            $enrolmentData['tentative_confirm'] = true;
            $enrolmentData['always_suppress_notifications'] = true;
            unset($params['webhookURL']);

        }

        if (!empty($url)) {
            $params['redirectURL'] = $url . '?enrolment=' . $enrolment_hash;
            $params['cancelURL'] = $url . '?enrolment=' . $enrolment_hash;
        }
        $enrolmentData['payment_flow_data']['passthrough'] = $params['redirectURL'];

        AX_Enrolments::updateEnrolmentWithoutRefresh($enrolment_hash, $enrolmentData);

        $endpoint = '/accounting/ecommerce/payment/url';
        $Response = $AxcelerateAPI->callResource($params, $endpoint, 'GET');

        if (isset($Response->DATA)) {
            echo json_encode($Response->DATA);
        } else {
            echo json_encode($Response);
        }
        //echo json_encode(array('PAYMENTURL' => 'http://localhost:8888/fakeurl'));
        die();

    }

    public static function getUserIP()
    {

        // There's discussion as to if you should use other code to check for proxies etc.
        // There could be a case for that, cloudflare may have explicit issues.
        $ip = $_SERVER['REMOTE_ADDR'];
        if (strlen($ip) > 6) {
            return $_SERVER['REMOTE_ADDR'];
        }
        // if you are testing this - you can add another ip here to send
        return '';

    }

    public static function ajax_payment_flow_form()
    {
        $invoiceGUID = $_REQUEST['invoice_guid'];
        $enrolment_hash = $_REQUEST['enrolment_hash'];

        $redirectPostID = get_option('ax_enrol_event_redirect_url');
        $url = '';

        $payViaToken = isset($_REQUEST['pay_by_token']);

        $provider = $_REQUEST['provider'];
        if (!empty($redirectPostID)) {
            $url = esc_url(get_permalink($redirectPostID));
        }

        if (key_exists('config_id', $_REQUEST)) {

            $config_id = $_REQUEST['config_id'];

            $mapping_settings = get_option('ax_config_comp_mapping_settings');
            $mapped = json_decode($mapping_settings, true, 10);
            $config;
            try {
                $config = $mapped[$config_id];
            } catch (\Throwable $th) {
                //throw $th;
            }

            if (!empty($config)) {
                $url = esc_url(get_permalink($config["PAGE_ID"]));
            }
        }
        $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);
        $enrolmentData['payment_flow'] = 'form_requested';

        $enrolmentData['payment_flow_data'] = array();
        $enrolmentData['payment_flow_data']['enrol_url'] = $_REQUEST['redirect_url'] . '?enrolment=' . $enrolment_hash;
        $enrolmentData['payment_flow_data']['isEZ'] = $provider === 'ezypay';
        // $enrolmentData['method'] = 'payment_flow';

        // not using method as it does not happen before the method executes.

        // need to "flag" the enrolment as having started this process

        $AxcelerateAPI = new AxcelerateAPI();

        $confirmURL = get_rest_url(null, 'axcelerate/v1/confirm_enrolment');

        $params = array(
            "reference" => $enrolment_hash,
            "invoiceGUID" => $invoiceGUID,
            "redirectURL" => $_REQUEST['redirect_url'] . '?enrolment=' . $enrolment_hash,
            "cancelURL" => $_REQUEST['redirect_url'] . '?enrolment=' . $enrolment_hash,
            'webhookURL' => $confirmURL . '?enrolment_hash=' . $enrolment_hash,
            'customerIP' => self::getUserIP(),
        );

        if ($payViaToken) {
            $params['tokenCustomer'] = true;
            $enrolmentData['pay_via_token'] = true;
            $enrolmentData['tentative_confirm'] = true;
            $enrolmentData['always_suppress_notifications'] = true;
            unset($params['webhookURL']);

        }

        if (!empty($url)) {
            $params['redirectURL'] = $url . '?enrolment=' . $enrolment_hash;
            $params['cancelURL'] = $url . '?enrolment=' . $enrolment_hash;
        }
        $enrolmentData['payment_flow_data']['passthrough'] = $params['redirectURL'];

        AX_Enrolments::updateEnrolmentWithoutRefresh($enrolment_hash, $enrolmentData);
        $ENDPOINT = '/accounting/ecommerce/payment/form/';

        $Response = $AxcelerateAPI->callResource($params, $ENDPOINT, 'GET');

        if (isset($Response->DATA)) {
            echo json_encode($Response->DATA);
        } else {
            echo json_encode($Response);
        }
        die();

    }

    /**
     * Used for payment plan payment forms
     */
    public static function ajax_payment_plan_form()
    {
        $invoiceGUID = $_REQUEST['invoice_guid'];
        $enrolment_hash = $_REQUEST['enrolment_hash'];

        $redirectPostID = get_option('ax_enrol_event_redirect_url');
        $url = '';

        $payViaToken = isset($_REQUEST['pay_by_token']);

        $provider = $_REQUEST['provider'];
        if (!empty($redirectPostID)) {
            $url = esc_url(get_permalink($redirectPostID));
        }

        if (key_exists('config_id', $_REQUEST)) {

            $config_id = $_REQUEST['config_id'];

            $mapping_settings = get_option('ax_config_comp_mapping_settings');
            $mapped = json_decode($mapping_settings, true, 10);
            $config;
            try {
                $config = $mapped[$config_id];
            } catch (\Throwable $th) {
                //throw $th;
            }

            if (!empty($config)) {
                $url = esc_url(get_permalink($config["PAGE_ID"]));
            }
        }
        $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);
        $enrolmentData['payment_flow'] = 'form_requested';

        $enrolmentData['payment_flow_data'] = array();
        $enrolmentData['payment_flow_data']['enrol_url'] = $_REQUEST['redirect_url'] . '?enrolment=' . $enrolment_hash;
        $enrolmentData['payment_flow_data']['isEZ'] = $provider === 'ezypay';
        // $enrolmentData['method'] = 'payment_flow';

        // not using method as it does not happen before the method executes.

        // need to "flag" the enrolment as having started this process

        $AxcelerateAPI = new AxcelerateAPI();

        $confirmURL = get_rest_url(null, 'axcelerate/v1/confirm_enrolment');

        $params = array(
            "reference" => $enrolment_hash,
            "invoiceGUID" => $invoiceGUID,
            "redirectURL" => $_REQUEST['redirect_url'] . '?enrolment=' . $enrolment_hash,
            'webhookURL' => $confirmURL . '?enrolment_hash=' . $enrolment_hash,
            'customerIP' => self::getUserIP(),
        );

        if ($payViaToken) {
            $params['tokenCustomer'] = true;
            $enrolmentData['pay_via_token'] = true;
            $enrolmentData['tentative_confirm'] = true;
            $enrolmentData['always_suppress_notifications'] = true;
            unset($params['webhookURL']);

        }

        if (!empty($url)) {
            $params['redirectURL'] = $url . '?enrolment=' . $enrolment_hash;
        }
        $enrolmentData['payment_flow_data']['passthrough'] = $params['redirectURL'];

        AX_Enrolments::updateEnrolmentWithoutRefresh($enrolment_hash, $enrolmentData);

        $Response = $AxcelerateAPI->callResource($params, '/accounting/ecommerce/payment/form/' . $provider, 'GET');

        if (isset($Response->DATA)) {
            echo json_encode($Response->DATA);
        } else {
            echo json_encode($Response);
        }
        die();

    }

    public static function ajax_payment_flow_begin()
    {

        $enrolment_hash = $_REQUEST['enrolment_hash'];

        $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);
        if (!empty($enrolmentData)) {
            $enrolmentData['payment_flow'] = 'flow_begun';
            $enrolmentData['method'] = 'payment_flow';

            if (!empty($_REQUEST['tentative_confirm'])) {
                $enrolmentData['tentative_confirm'] = $_REQUEST['tentative_confirm'] === 'tentative';
            }
            $log = array(
                'enrolment_hash' => $enrolment_hash,
                'tentative' => key_exists('tentative_confirm', $_REQUEST) ? $_REQUEST['tentative_confirm'] === 'tentative' : false,
            );

            AX_Enrolments::updateEnrolmentWithoutRefresh($enrolment_hash, $enrolmentData);

        }
        echo json_encode(array('complete' => true));
        die();

    }

    public static function ajax_select_plan()
    {
        $AxcelerateAPI = new AxcelerateAPI();

        $planID = $_REQUEST['payment_plan_id'];
        $reference = $_REQUEST['reference'];
        $invoiceGUID = $_REQUEST['invoice_guid'];

        $callbackURL = $_REQUEST['callback'];

        $enrolmentData = AX_Enrolments::getEnrolmentByID($reference);

        $enrolmentData['ezypay_plan_selected'] = $planID;
        AX_Enrolments::updateEnrolmentWithoutRefresh($reference, $enrolmentData);
        $redirectPostID = get_option('ax_enrol_event_redirect_url');
        $url = '';

        if (!empty($redirectPostID)) {
            $url = esc_url(get_permalink($redirectPostID));
        }

        // This must match with the other URL.
        if (key_exists('config_id', $_REQUEST)) {

            $config_id = $_REQUEST['config_id'];

            $mapping_settings = get_option('ax_config_comp_mapping_settings');
            $mapped = json_decode($mapping_settings, true, 10);
            $config;
            try {
                if (isset($mapped)) {
                    $config = $mapped[$config_id];
                }
            } catch (\Throwable $th) {
                //throw $th;
            }

            if (!empty($config)) {
                $url = esc_url(get_permalink($config["PAGE_ID"]));
            }
        }

        $ePayParams = array(
            'termID' => $planID,
            'reference' => $reference,
            'invoiceGUID' => $invoiceGUID,
            'callback' => $callbackURL,
        );

        if (!empty($url)) {
            $ePayParams['callback'] = $url . '?enrolment=' . $reference;
        }

        $epayResponse = $AxcelerateAPI->callResource($ePayParams, '/accounting/ecommerce/ezypay/paymentrecord', 'POST');

        echo json_encode(array('response' => $epayResponse));
        die();
    }

    public static function confirmEnrolment($enrolment_hash)
    {
        $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);

        if (!empty($enrolmentData)) {
            $confirm = AX_Enrolments::confirmEnrolment($enrolmentHash);
            if (!empty($confirm)) {
                return array("success" => true);

            }

        } else {
            return array("error" => true, "error_type" => 'missing_enrolment');
        }

    }

    public static function checkStatusEzyPay($enrolment_hash)
    {
        $AxcelerateAPI = new AxcelerateAPI();
        $enrolmentStatus = $AxcelerateAPI->callResource(array(), '/accounting/ecommerce/ezypay/ref/' . $enrolment_hash, 'GET');
        if (!empty($enrolmentStatus)) {

            if ($enrolmentStatus instanceof stdClass) {
                if (!empty($enrolmentStatus->STATUS)) {
                    return $enrolmentStatus;
                }
            }
        } else {
            return array('error' => $enrolmentStatus);
        }
        return $enrolmentStatus;
    }

    public static function checkStatus($enrolment_hash)
    {
        $AxcelerateAPI = new AxcelerateAPI();
        $Response = $AxcelerateAPI->callResource(array(), '/accounting/ecommerce/payment/ref/' . $enrolment_hash, 'GET');

        return $Response;

    }

    public static function checkStatusEzySingle($enrolment_hash)
    {
        $AxcelerateAPI = new AxcelerateAPI();

        $Response = $AxcelerateAPI->callResource(array('reference' => $enrolment_hash), '/accounting/ecommerce/ezypay/checkout/ref/' . $enrolment_hash, 'GET');

        if ($Response && isset($Response->DATA)) {
            return $Response->DATA;
        }
        return $Response;

    }
    public static function checkStatusAndConfirm($enrolment_hash, $status)
    {
        $successful = false;
        $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);

        if (!empty($enrolmentData['payment_flow_data']['isEZ'])) {

            $statusObj = self::checkStatusEzyPay($enrolment_hash);

            if (!empty($statusObj->STATUS)) {
                if ($statusObj->STATUS === "CHARGED") {

                    $successful = true;
                }
            }
        } else if (!empty($enrolmentData['payment_flow_data']['provider']) && $enrolmentData['payment_flow_data']['provider'] === 'eway') {
            $statusObj = self::checkStatus($enrolment_hash);

            if (isset($statusObj->PLATFORMRESPONSE)) {
                $successful = !empty($statusObj->PLATFORMRESPONSE->SUCCESS);
            }
        } else if (!empty($enrolmentData['payment_flow']) && $enrolmentData['payment_flow'] === 'url_requested') {

            $statusObj = self::checkStatusEzySingle($enrolment_hash);

            if ($statusObj && isset($statusObj->STATUS)) {
                switch ($statusObj->STATUS) {
                    case 'PENDING':
                        return array(
                            'success' => false,
                            'status' => 'epayment_redirect_resume',
                            'message' => 'Incomplete Enrolment Found ',
                            'redirect_url' => $enrolmentData['payment_flow_data']['enrol_url'],
                        );
                        break;
                    case 'COMPLETE':
                    case 'PAID':

                        $confirm = AX_Enrolments::confirmEnrolment($enrolment_hash);

                        if (!empty($confirm) && !key_exists('error', $confirm)) {
                            $enrolmentData['confirmed_enrolments'] = $confirm;
                            $response['success'] = true;
                            return array(
                                'success' => true,
                                'status' => 'single_payment_complete',
                                'message' => 'Enrolment Complete',
                            );
                            break;

                        }
                        return array(
                            'success' => false,
                            'status' => 'confirmation_failure',
                            'message' => 'Unable to confirm enrolment',
                            'detail' => $confirm,
                        );
                        break;

                    default:
                        # code...
                        break;
                }
            }
        } else {
            $statusObj = self::checkStatus($enrolment_hash);
        }

        if (!empty($enrolmentData)) {
            if ($successful || !empty($statusObj->RESULT->OK)) {

                $confirm = AX_Enrolments::confirmEnrolment($enrolment_hash);
                if (!empty($confirm) && !key_exists('error', $confirm)) {
                    $enrolmentData['confirmed_enrolments'] = $confirm;
                    $response['success'] = true;
                    return array('success' => true, 'status' => 'complete', 'message' => 'Enrolment Complete');
                }
                return array(
                    'success' => false,
                    'status' => 'confirmation_failure',
                    'message' => 'Unable to confirm enrolment',
                    'detail' => $confirm,
                );

            } else {
                return array(
                    'success' => false,
                    'status' => 'epayment_redirect_resume',
                    'message' => 'Incomplete Enrolment Found: ',
                    'error_content' => isset($statusObj->RESULT) ? $statusObj->RESULT->ERROR->MSG : print_r($statusObj->RESULT, true),
                    'redirect_url' => $enrolmentData['payment_flow_data']['enrol_url'],
                );
            }
        }
        return array(
            'success' => false,
        );
    }

    public static function checkStatusAndNextAction($enrolment_hash, $status, $ref)
    {
        $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);

        if (!empty($enrolmentData)) {
            if (empty($status)) {
                return array("error" => true, "error_type" => 'missing_status');
            } else if ($status === "false") {
                return array("error" => true, "error_type" => 'failed');
            } else {
                $callbackURL = $enrolmentData['payment_flow_data']['passthrough'];
                return array('epayment_redirect_success' => $callbackURL);

            }

        } else {
            return array("error" => true, "error_type" => 'missing_enrolment');
        }

    }

}
