import { GameEventCenter, NetworkEventCenter } from "../../../Event/EventTarget";
import { GameEvent, NetworkEventToS } from "../../../Event/type";
import { GameData } from "../../../Manager/GameData";
import { Card } from "../../../Components/Card/Card";
import { CardColor, CardDefaultOption, CardOnEffectParams, CardStatus, CardType } from "../type";
import { GamePhase } from "../../../Manager/type";
import { GameManager } from "../../../Manager/GameManager";
import { CardOnEffect } from "../../../Event/GameEventType";
import { GameLog } from "../../GameLog/GameLog";

export class PoYi extends Card {
  public readonly availablePhases = [GamePhase.SEND_PHASE];

  private messageStatus: CardStatus;

  get description() {
    return "传递阶段，查看传递到你面前的情报，若该情报是黑色，你可以将其翻开，然后摸一张牌。";
  }

  constructor(option: CardDefaultOption) {
    super({
      id: option.id,
      name: "破译",
      type: CardType.PO_YI,
      direction: option.direction,
      color: option.color,
      lockable: option.lockable,
      status: option.status,
      gameObject: option.gameObject,
    });
  }

  canPlay(gui: GameManager) {
    return gui.data.messagePlayerId === 0;
  }

  onPlay(gui: GameManager): void {
    NetworkEventCenter.emit(NetworkEventToS.USE_PO_YI_TOS, {
      cardId: this.id,
      seq: gui.seq,
    });
  }

  onEffect(gameData: GameData, { userId, targetCard }: CardOnEffectParams): void {
    const gamelog = gameData.gameLog;
    this.messageStatus = gameData.messageInTransmit.status;
    if (userId === 0) {
      const message = gameData.createMessage(targetCard);
      this.showMessageInTransmit(gameData, message);
      const isBlackMessage = Card.hasColor(message, CardColor.BLACK);
      gamelog.addData(new GameLog(`传递中的情报是${gamelog.formatCard(message)}`));
      GameEventCenter.emit(GameEvent.CARD_ON_EFFECT, {
        card: this,
        handler: "promptChooseDraw",
        params: {
          isBlackMessage,
        },
      } as CardOnEffect);
    }
  }

  promptChooseDraw(gui: GameManager, params) {
    const { isBlackMessage } = params;
    const tooltip = gui.tooltip;
    tooltip.setText(`是否翻开并摸一张牌？`);
    tooltip.buttons.setButtons([
      {
        text: "确定",
        onclick: () => {
          NetworkEventCenter.emit(NetworkEventToS.PO_YI_SHOW_TOS, {
            show: true,
            seq: gui.seq,
          });
        },
        enabled: isBlackMessage,
      },
      {
        text: "取消",
        onclick: () => {
          NetworkEventCenter.emit(NetworkEventToS.PO_YI_SHOW_TOS, {
            show: false,
            seq: gui.seq,
          });
        },
      },
    ]);
  }

  onShow(gameData: GameData, { userId, targetCard, flag }: CardOnEffectParams) {
    if (flag) {
      if (userId !== 0) {
        const message = gameData.createMessage(targetCard);
        this.showMessageInTransmit(gameData, message);
      }
    } else {
      if (userId === 0 && this.messageStatus === CardStatus.FACE_DOWN) {
        gameData.messageInTransmit.status = CardStatus.FACE_UP;
        gameData.messageInTransmit.gameObject?.flip();
      }
    }
  }

  showMessageInTransmit(gameData: GameData, message: Card) {
    if (message.status === CardStatus.FACE_DOWN) {
      message.gameObject = gameData.messageInTransmit.gameObject;
      gameData.messageInTransmit = message;
      message.status = CardStatus.FACE_UP;
      message.gameObject?.flip();
    }
  }

  copy() {
    return new PoYi({
      id: this.id,
      direction: this.direction,
      color: this.color?.slice(),
      lockable: this.lockable,
      status: this.status,
    });
  }
}
