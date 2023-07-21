import { _decorator, Node, Prefab, instantiate, ScrollView } from "cc";
import { GameLog } from "./GameLog";
import { GameObjectContainer } from "../Container/GameObjectContainer";
import { GameLogTextObject } from "./GameLogTextObject";
import { GameLogMessageObject } from "./GameLogMessageObject";
const { ccclass, property } = _decorator;

@ccclass("GameLogWindow")
export class GameLogWindow extends GameObjectContainer<GameLogTextObject> {
  @property(Prefab)
  logPrefab: Prefab | null = null;

  public viewContent: Node;

  onEnable() {
    this.getComponentInChildren(ScrollView).scrollToBottom(0);
  }

  init() {
    this.viewContent = this.node.getChildByPath("ScrollView/view/content");

    this.node.getChildByName("CloseButton").on(Node.EventType.TOUCH_END, () => {
      this.node.active = false;
    });
  }
  onDataAdded(data: GameLog): void {
    const object = instantiate(this.logPrefab);
    data.gameObject = <GameLogTextObject & GameLogMessageObject>object.getComponent(GameLogTextObject);
    data.gameObject.setText(data.text);
    this.viewContent.addChild(object);
  }
  onDataRemoved(data: GameLog): void {}
  onAllDataRemoved(): void {}
}
