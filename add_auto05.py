import json

file_path = '/home/deden/Documents/dev/software-smartrack/templates/rule-chain/smartrack.json'

with open(file_path, 'r') as f:
    data = json.load(f)

new_chain = {
    "name": "AUTO-05: Severity RGB Controller",
    "description": "Control Modbus RGB Controller based on UPS and Cooling alarm severity",
    "nodes": [
        {
            "id": "auto05-timer",
            "type": "timerSchedulerNode",
            "position": {"x": 50, "y": 200},
            "data": {
                "label": "10s Scheduler",
                "config": {
                    "scheduleType": "interval",
                    "intervalSeconds": 10
                },
                "nodeId": "auto05-timer"
            }
        },
        {
            "id": "auto05-severity",
            "type": "analyticsNode",
            "position": {"x": 300, "y": 200},
            "data": {
                "label": "Severity Aggregate",
                "config": {
                    "nodeSubType": "severityAggregate",
                    "rules": [
                        {
                            "deviceUniqId": "smartrack-ups-1",
                            "selectedKey": "On_Battery_Alarm",
                            "operator": "==",
                            "comparisonValue": "1",
                            "severityLevel": "CRITICAL"
                        },
                        {
                            "deviceUniqId": "smartrack-ups-1",
                            "selectedKey": "Depleted_Battery_Alarm",
                            "operator": "==",
                            "comparisonValue": "1",
                            "severityLevel": "CRITICAL"
                        },
                        {
                            "deviceUniqId": "smartrack-cooling-1",
                            "selectedKey": "Serious_Alarm_Output",
                            "operator": "==",
                            "comparisonValue": "1",
                            "severityLevel": "CRITICAL"
                        },
                        {
                            "deviceUniqId": "smartrack-cooling-1",
                            "selectedKey": "Common_Alarm_Output",
                            "operator": "==",
                            "comparisonValue": "1",
                            "severityLevel": "MINOR"
                        }
                    ]
                },
                "nodeId": "auto05-severity"
            }
        },
        {
            "id": "auto05-switch",
            "type": "switchNode",
            "position": {"x": 550, "y": 200},
            "data": {
                "label": "Switch Severity",
                "config": {
                    "leftOperand": {
                        "type": "deviceField",
                        "deviceName": "Severity Aggregate",
                        "key": "severity"
                    },
                    "cases": [
                        {
                            "id": "case-critical",
                            "label": "Critical",
                            "operator": "==",
                            "rightOperand": {
                                "type": "staticValue",
                                "value": "critical"
                            }
                        },
                        {
                            "id": "case-minor",
                            "label": "Minor",
                            "operator": "==",
                            "rightOperand": {
                                "type": "staticValue",
                                "value": "minor"
                            }
                        }
                    ],
                    "defaultCase": {
                        "label": "Normal/Default"
                    }
                },
                "nodeId": "auto05-switch"
            }
        },
        {
            "id": "auto05-red",
            "type": "actionNode",
            "position": {"x": 850, "y": 100},
            "data": {
                "label": "Publish RED to RGB",
                "config": {
                    "topic": "command/rgb",
                    "payload": "{\"color\":\"red\"}",
                    "payloadMode": "custom"
                },
                "nodeId": "auto05-red"
            }
        },
        {
            "id": "auto05-yellow",
            "type": "actionNode",
            "position": {"x": 850, "y": 200},
            "data": {
                "label": "Publish YELLOW to RGB",
                "config": {
                    "topic": "command/rgb",
                    "payload": "{\"color\":\"yellow\"}",
                    "payloadMode": "custom"
                },
                "nodeId": "auto05-yellow"
            }
        },
        {
            "id": "auto05-green",
            "type": "actionNode",
            "position": {"x": 850, "y": 300},
            "data": {
                "label": "Publish GREEN to RGB",
                "config": {
                    "topic": "command/rgb",
                    "payload": "{\"color\":\"green\"}",
                    "payloadMode": "custom"
                },
                "nodeId": "auto05-green"
            }
        }
    ],
    "edges": [
        {
            "id": "e-timer-severity",
            "source": "auto05-timer",
            "target": "auto05-severity",
            "type": "custom",
            "label": "trigger",
            "data": {
                "edgeType": "success"
            }
        },
        {
            "id": "e-severity-switch",
            "source": "auto05-severity",
            "target": "auto05-switch",
            "type": "custom",
            "label": "success",
            "data": {
                "edgeType": "success"
            }
        },
        {
            "id": "e-switch-red",
            "source": "auto05-switch",
            "target": "auto05-red",
            "type": "custom",
            "label": "Critical",
            "data": {
                "edgeType": "condition",
                "operator": "==",
                "value": "critical"
            }
        },
        {
            "id": "e-switch-yellow",
            "source": "auto05-switch",
            "target": "auto05-yellow",
            "type": "custom",
            "label": "Minor",
            "data": {
                "edgeType": "condition",
                "operator": "==",
                "value": "minor"
            }
        },
        {
            "id": "e-switch-green",
            "source": "auto05-switch",
            "target": "auto05-green",
            "type": "custom",
            "label": "Normal/Default",
            "data": {
                "edgeType": "default"
            }
        }
    ],
    "isActive": False
}

data['ruleChains'].append(new_chain)
data['totalRuleChains'] = len(data['ruleChains'])

with open(file_path, 'w') as f:
    json.dump(data, f, indent=2)

print("Added AUTO-05 to smartrack.json")
