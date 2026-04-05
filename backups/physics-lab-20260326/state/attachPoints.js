// Attachment Points for String Connections
// Returns [{key, label, getXY(item)}] for each item type

import { TBL_Y } from '../lab/physics';

export function getAttachPoints(item) {
  const w = item.props.width || 40;
  const h = item.props.height || 30;
  const cx = item.x + w / 2;
  const cy = item.y + h / 2;

  switch (item.type) {
    case "track":
      return [
        { key: "leftLeg", label: "Left leg", getXY: () => ({ x: item.x + 20, y: TBL_Y }) },
        { key: "rightLeg", label: "Right leg", getXY: () => ({ x: item.x + w - 20, y: TBL_Y }) },
      ];

    case "cart":
      return [
        { key: "leftHole", label: "Left end hole", getXY: () => ({ x: item.x, y: cy }) },
        { key: "rightHole", label: "Right end hole", getXY: () => ({ x: item.x + w, y: cy }) },
        { key: "leftWheel", label: "Left wheel", getXY: () => ({ x: item.x + 10, y: item.y + h + 1 }) },
        { key: "rightWheel", label: "Right wheel", getXY: () => ({ x: item.x + w - 10, y: item.y + h + 1 }) },
      ];

    case "motionDetector":
      return [
        { key: "around", label: "Around body", getXY: () => ({ x: cx, y: cy }) },
      ];

    case "pulley":
      return [
        { key: "over", label: "Drape over", getXY: () => ({ x: cx, y: item.y }) },
        { key: "axle", label: "Tie to axle", getXY: () => ({ x: cx, y: cy }) },
      ];

    case "massHanger":
      return [
        { key: "hook", label: "Tie to hook", getXY: () => ({ x: cx, y: item.y }) },
      ];

    case "bubbleLevel":
      return [
        { key: "center", label: "Tie to level", getXY: () => ({ x: cx, y: cy }) },
      ];

    case "meterStick":
      return [
        { key: "left", label: "Left end", getXY: () => ({ x: item.x, y: cy }) },
        { key: "right", label: "Right end", getXY: () => ({ x: item.x + w, y: cy }) },
        { key: "center", label: "Center", getXY: () => ({ x: cx, y: cy }) },
      ];

    default:
      return [];
  }
}
