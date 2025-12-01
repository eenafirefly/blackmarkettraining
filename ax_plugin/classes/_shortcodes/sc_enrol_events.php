<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */

if (!class_exists('AX_Enrol_Events')) {
    class AX_Enrol_Events
    {
        public function __construct()
        {

            add_shortcode('ax_enrol_event', array(&$this, 'ax_enrol_event_handler'));
            add_shortcode('ax_enrol_event_enrolments_list', array(&$this, 'ax_enrol_event_enrolments_list_handler'));
        }

        public function ax_enrol_event_handler($atts = array(), $content = null)
        {
            $default_stylesheet = plugins_url('/css/ax-standard.css', AXIP_PLUGIN_NAME);
            wp_register_style('ax-standard', $default_stylesheet, array());
            wp_enqueue_style('ax-standard');

            wp_register_style('ax-countdown', plugins_url('/css/countdown.css', __FILE__), array());
            wp_enqueue_style('ax-countdown');

            wp_register_script(
                'ax-countdown',
                plugins_url('js/countdown.js', __FILE__),
                array('jquery'),
                AXIP_PLUGIN_VERSION
            );
            wp_enqueue_script('ax-countdown');

            $html = '';
            extract(
                shortcode_atts(
                    array(
                        'enrolment_hash' => '',
                        'custom_css' => '',
                        'class_to_add' => '',
                        'wrap_tag' => '',
                    ),
                    $atts
                )
            );
            if (empty($enrolment_hash)) {
                $enrolment_hash = get_query_var('enrolment');
            }
            $axCustom = get_query_var('ax_custom');
            $axP = get_query_var('ax_p');
            $processID = $enrolment_hash;
            if (!empty($axCustom)) {
                $enrolment_hash = $axCustom;

            } else if (!empty($axP)) {
                $enrolment_hash = $axP;
                $processID = $axP;
            }

            $epayment_check = false;
            $successful = true;

            wp_register_script(
                'ax-enrol-events',
                plugins_url('js/sc_enrol_events.js', __FILE__),
                array('jquery'),
                AXIP_PLUGIN_VERSION
            );

            $enqueue = false;

            if (!empty($enrolment_hash)) {

                $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);

                /*VERIFY HASH BEFORE RETURNING HTML*/
                if (!empty($enrolmentData)) {
                    if (key_exists('method', $enrolmentData)) {

                        if ("epayment" == $enrolmentData['method'] || "payment_flow" == $enrolmentData['method']) {
                            $epayment_check = true;
                            $paymentFlow = "payment_flow" == $enrolmentData['method'];

                            if (empty($processID)) {
                                $processID = $enrolment_hash;
                            }

                            wp_enqueue_script('ax-enrol-events');

                            $options = array(
                                'ajaxURL' => admin_url('admin-ajax.php'),
                                'ax_process_id' => $processID,
                                'enrolment_hash' => $enrolment_hash,
                                'run_enrolment_check' => true,
                                'method' => $enrolmentData['method'],
                                'status' => get_query_var('ok'),

                            );
                            if (key_exists('payment_flow_data', $enrolmentData)) {
                                if (key_exists('enrol_url', $enrolmentData['payment_flow_data'])) {
                                    $options['enrol_url'] = $enrolmentData['payment_flow_data']['enrol_url'];
                                }
                            }

                            wp_localize_script('ax-enrol-events', 'enrol_event_vars', $options);

                        } else {
                            $enqueue = true;
                        }
                        // Disable this for testing purposes.
                        if ("epayment" == $enrolmentData['method'] && false) {

                            // TODO: Make this an ajax process.
                            $status = AX_EPayment_Service::checkStatusAndNextAction($enrolment_hash, $axP);
                            if (!empty($status)) {
                                if (key_exists('epayment_redirect_success', $status)) {
                                    $confirm = AX_Enrolments::confirmEnrolment($enrolment_hash);
                                    if (!empty($confirm)) {
                                        $enrolmentData['confirmed_enrolments'] = $confirm;
                                        $html .= json_encode($confirm);
                                        //TODO: add success messsageees!
                                    }
                                } elseif (key_exists('epayment_failure', $status)) {
                                    $successful = false;

                                    $errorMessage
                                    = '<div class="epayment-failure-primary">
                                        <h3>Could not resume enrolment.</h3>
                                        <p>An error has occurred with your payment which prevents resumption of the enrolment process.</p>
                                        <p>Please contact our office to resolve the issue.</p>
                                    </div>';

                                    if (key_exists('epayment_error', $status)) {
                                        if ($status['epayment_error'] instanceof stdClass) {
                                            if (!empty($status['epayment_error']->MESSAGES)) {
                                                $errorMessage
                                                .= '<div class="epayment-failure-message"><p>'
                                                . $status['epayment_error']->MESSAGES . '</p></div>';
                                            }
                                        }
                                    }

                                    $html .= $errorMessage;
                                } elseif (key_exists('epayment_redirect_resume', $status)) {
                                    $successful = false;
                                    $url = $status['epayment_redirect_resume'];
                                    if (empty($url)) {
                                        $url = get_permalink();
                                    }
                                    $message
                                    = '<div class="epayment-failure-primary">
                                        <h3>Enrolment Found.</h3>
                                        <p>An incomplete enrolment has been found. You will be redirected automatically, or you may click the link below.</p>
                                        <p>Should you encounter any issues please get in touch with our office.</p>
                                    </div>';

                                    $message
                                    .= '<div class="ax-countdown">
                                                <span class="seconds"></span>
                                            </div>';
                                    $message
                                    .= '<script>

                                                jQuery(function($){
                                                    if(window.initialiseCountdown != null){
                                                        var url = "' . $url . '";
                                                        var link = $("<a>Continue</a>").attr("href",url);
                                                        $(".ax-countdown").append(link);
                                                        initialiseCountdown(15,
                                                            function(count){
                                                                if(count < 10){
                                                                    count = "0" + count;
                                                                }
                                                                $(".seconds").empty().append("Redirecting in " + count);


                                                            },
                                                            function(){
                                                                console.log("redirecting to: " + url);
                                                                if(window.location != url){
                                                                    window.location = "' . $url . '";
                                                                }
                                                            }
                                                        );
                                                    }
                                                });
                                            </script>';

                                    $html .= $message;

                                }
                            }
                        }
                    } else {
                        $enqueue = true;
                    }

                    if ($successful) {
                        if (empty($content)) {
                            $content = get_option('ax_enrol_event_success_content');
                        }
                        $html .= $content;
                    }

                    $html = str_replace('[ax_enrol_event_enrolments_list', '[ax_enrol_event_enrolments_list enrolment_hash=' . $enrolment_hash, $html);
                    $html = str_replace('[ax_enrol_widget', '[ax_enrol_widget nested_enrol_event=1 ', $html);

                    if (!empty($custom_css)) {
                        $AxcelerateShortcode = new AxcelerateShortcode();
                        $css = $AxcelerateShortcode->ax_decode_custom_css($custom_css, $atts, 'ax_enrol_event');
                        $class_to_add = $class_to_add . ' ' . $css;
                    }
                    $class_to_add .= ' ax-enrol-event-holder';
                    if (!empty($wrap_tag)) {
                        $style = "";
                        if ($epayment_check) {
                            $style = "display:none;";
                        }
                        $html = '<' . $wrap_tag . ' class="' . $class_to_add . '" style="' . $style . '">' . $html . '</' . $wrap_tag . '>';
                    } else {
                        $style = "";
                        if ($epayment_check) {
                            $style = "display:none;";
                        }
                        $html = '<div class="' . $class_to_add . '" style="' . $style . '">' . $html . '</div>';
                    }
                    //Moves this slightly up in the list. but not really early enough.

                    AX_Analytics::add_data_layer_for_enrolments($enrolmentData);

                } else {

                }
            }
            if ($enqueue) {
                wp_enqueue_script('ax-enrol-events');

                $options = array(
                    'ajaxURL' => admin_url('admin-ajax.php'),

                );

                wp_localize_script('ax-enrol-events', 'enrol_event_vars', $options);
            }
            return do_shortcode($html);
        }

        public function ax_enrol_event_enrolments_list_handler($atts = array())
        {
            extract(shortcode_atts(array(
                'enrolment_hash' => '',
                'custom_css' => '',
                'class_to_add' => '',
            ), $atts));
            if (empty($enrolment_hash)) {
                $enrolment_hash = get_query_var('enrolment');
            }
            $html = '';
            if (!empty($custom_css)) {
                $AxcelerateShortcode = new AxcelerateShortcode();
                $css = $AxcelerateShortcode->ax_decode_custom_css($custom_css, $atts, 'ax_enrol_event_enrolments_list');
                $class_to_add = $class_to_add . ' ' . $css;
            }

            if (!empty($enrolment_hash)) {
                $enrolmentData = AX_Enrolments::getEnrolmentByID($enrolment_hash);
                if (!empty($enrolmentData)) {
                    /*Create Lookup array for Contact IDs*/
                    $contactList = array();
                    if (!empty($enrolmentData['enrolments'])) {
                        foreach ($enrolmentData['enrolments'] as $key => $value) {
                            $contactList[$key] = $value['CONTACT_NAME'];
                        }
                    }

                    $enrolmentList = array();
                    if (!empty($enrolmentData['enrolment_status'])) {
                        foreach ($enrolmentData['enrolment_status'] as $row) {
                            if (!empty($row['SUCCESS'])) {
                                $success = 'Successful';
                            } else {
                                $success = 'Incomplete.';
                            }
                            $tempRow = '<tr>
								<td>' . $contactList[$row['CONTACTID']] . '</td>
								<td>' . $row['ENROLMENT']['COURSENAME'] . '</td>
								<td>' . $success . '</td>

							</tr>';
                            array_push($enrolmentList, $tempRow);
                        };
                    }
                    if ($enrolmentList) {
                        $html = '<table class="ax-enrol-event-enrolments ' . $class_to_add . '"><tbody>';
                        foreach ($enrolmentList as $row) {
                            $html = $html . $row;
                        }
                        $html = $html . '</tbody></table>';
                    }
                }
            }

            return $html;
        }
    }
    $AX_Enrol_Events = new AX_Enrol_Events();

    if (class_exists('WPBakeryShortCode') && class_exists('AX_VC_PARAMS') && class_exists('WPBakeryShortCodesContainer')) {
        vc_map(array(
            "name" => __("aX Enrolment Event", "axcelerate"),
            "base" => "ax_enrol_event",
            "icon" => plugin_dir_url(AXIP_PLUGIN_NAME) . 'images/ax_icon.png',
            "description" => __("Enrolment Event Handler", "axcelerate"),
            "content_element" => true,
            "show_settings_on_create" => true,
            'js_view' => 'VcColumnView',
            "as_parent" => array('except' => 'ax_course_list,ax_course_details,ax_course_instance_list', 'only' => ''),
            //"as_child"=>array('except'=> 'ax_course_list,ax_course_details,ax_course_instance_list', 'only'=>''),
            //"is_container" => true,
            "category" => array(
                'aX Parent Codes',
            ),

            'params' => array(
                AX_VC_PARAMS::$AX_VC_CUSTOM_CSS_PARAM,
                AX_VC_PARAMS::$AX_VC_ADD_CSS_CLASS_PARAM,
                AX_VC_PARAMS::$AX_VC_WRAPPER_TAG_PARAM,

            ),
        ));
        class WPBakeryShortCode_aX_Enrol_Event extends WPBakeryShortCodesContainer
        {
        }

        vc_map(array(
            "name" => __("aX EE Enrolments List", "axcelerate"),
            "base" => "ax_enrol_event_enrolments_list",
            "icon" => plugin_dir_url(AXIP_PLUGIN_NAME) . 'images/ax_icon.png',
            "content_element" => true,
            "description" => __("Enrolment Event Enrolments List", "axcelerate"),
            "show_settings_on_create" => true,
            "is_container" => false,
            "as_parent" => array('only' => ''),

            "category" => array(
                'aX Enrolment Event',
            ),
            'params' => array(
                AX_VC_PARAMS::$AX_VC_CUSTOM_CSS_PARAM,
                AX_VC_PARAMS::$AX_VC_ADD_CSS_CLASS_PARAM,

            ),
        ));
        class WPBakeryShortCode_aX_Enrol_Event_Enrolments_List extends WPBakeryShortCode
        {
        }

    }
}
