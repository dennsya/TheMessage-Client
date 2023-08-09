import { GameEventCenter, NetworkEventCenter } from "../../../Event/EventTarget";
import { GameEvent, NetworkEventToS } from "../../../Event/type";
import { GameData } from "../../../Manager/GameData";
import { Card } from "../../../Components/Card/Card";
import { CardColor, CardOnEffectParams, CardType, MiLingOption } from "../type";
import { GamePhase } from "../../../Manager/type";
import { getCardColorText } from "../../../Utils";
import { GameManager } from "../../../Manager/GameManager";
import { CardOnEffect } from "../../../Event/GameEventType";
import { Player } from "../../Player/Player";
import { GameLog } from "../../GameLog/GameLog";
import { PlayerAction } from "../../../Utils/PlayerAction";

export class MiLing extends Card {
  public readonly availablePhases = [GamePhase.SEND_PHASE_START];
  private _secretColor: CardColor[];

  get secretColor() {
    return this._secretColor;
  }

  constructor(option: MiLingOption) {
    super({
      id: option.id,
      name: "密令",
      type: CardType.MI_LING,
      src: "MiLing",
      direction: option.direction,
      color: option.color,
      lockable: option.lockable,
      status: option.status,
      gameObject: option.gameObject,
    });
    this._secretColor = option.secretColor;
  }

  onSelectedToPlay(gui: GameManager): void {
    const tooltip = gui.tooltip;
    tooltip.setText(`请选择密令的目标`);
    tooltip.buttons.setButtons([]);
    gui.gameLayer.startSelectPlayers({
      num: 1,
      filter: (player: Player) => {
        return player.handCardCount > 0 && player.id !== 0;
      },
      onSelect: () => {
        tooltip.setText(`请选择一个暗号`);
        tooltip.buttons.setButtons([
          {
            text: "东风",
            onclick: () => {
              this.secretButtonClicked(gui, 0);
            },
          },
          {
            text: "西风",
            onclick: () => {
              this.secretButtonClicked(gui, 1);
            },
          },
          {
            text: "静风",
            onclick: () => {
              this.secretButtonClicked(gui, 2);
            },
          },
        ]);
      },
    });
  }

  onDeselected(gui: GameManager) {
    gui.gameLayer.stopSelectPlayers();
  }

  onEffect(gameData: GameData, { playerId, targetPlayerId, secret, card, hasColor, handCards }: CardOnEffectParams) {
    let secretText;
    switch (secret) {
      case 0:
        secretText = "东风";
        break;
      case 1:
        secretText = "西风";
        break;
      case 2:
        secretText = "静风";
        break;
    }
    const targetPlayer = gameData.playerList[targetPlayerId];

    const gameLog = gameData.gameLog;
    const player = gameData.playerList[playerId];
    gameLog.addData(new GameLog(`${gameLog.formatPlayer(player)}宣言了${secretText}`));

    if (hasColor) {
      if (targetPlayerId === 0) {
        const color: CardColor = card.secretColor[secret];
        GameEventCenter.emit(GameEvent.CARD_ON_EFFECT, {
          card: this,
          handler: "promptTargetPlayerChooseCard",
          params: {
            color,
            secretText,
          },
        } as CardOnEffect);
      }
    } else {
      gameLog.addData(
        new GameLog(
          `${gameLog.formatPlayer(targetPlayer)}没有对应颜色的卡牌，由${gameLog.formatPlayer(player)}选择一张牌传出`
        )
      );
      if (playerId === 0) {
        const handCardList = handCards.map((card) => {
          return gameData.createCard(card);
        });
        GameEventCenter.emit(GameEvent.CARD_ON_EFFECT, {
          card: this,
          handler: "promptPlayerChooseCard",
          params: {
            handCardList,
          },
        } as CardOnEffect);
      }
    }
  }

  promptTargetPlayerChooseCard(gui: GameManager, params) {
    const { secretText, color } = params;
    const handCardList = gui.data.handCardList;
    const tooltip = gui.tooltip;
    gui.uiLayer.playerActionManager.clearAction();
    gui.uiLayer.playerActionManager.setDefaultAction(
      new PlayerAction({
        actions: [
          {
            name: "selectCard",
            handler: () =>
              new Promise((resolve, reject) => {
                let tooltipText = "密令的暗号为" + secretText;
                tooltipText += `,请选择一张${getCardColorText(color)}色情报传出`;
                tooltip.setText(tooltipText);
                gui.gameLayer.startSelectHandCards({ num: 1 });
                tooltip.buttons.setButtons([
                  {
                    text: "传递情报",
                    onclick: () => {
                      resolve(null);
                    },
                    enabled: () => {
                      return (
                        handCardList.selectedCards.list[0] && Card.hasColor(handCardList.selectedCards.list[0], color)
                      );
                    },
                  },
                ]);
              }),
          },
        ],
      }).union(gui.uiLayer.createDoSendMessageAction.apply(gui.uiLayer))
    );
    gui.uiLayer.playerActionManager.switchToDefault();
  }

  promptPlayerChooseCard(gui: GameManager, params) {
    if (!gui.isRecord) {
      const { handCardList } = params;
      const showCardsWindow = gui.showCardsWindow;
      showCardsWindow.show({
        title: "选择一张情报由目标传出",
        cardList: handCardList,
        limit: 1,
        buttons: [
          {
            text: "确定",
            onclick: () => {
              NetworkEventCenter.emit(NetworkEventToS.MI_LING_CHOOSE_CARD_TOS, {
                cardId: showCardsWindow.selectedCards.list[0].id,
                seq: gui.seq,
              });
              showCardsWindow.hide();
            },
            enabled: () => !!showCardsWindow.selectedCards.list.length,
          },
        ],
      });
    }
  }

  onChooseCard(gameData: GameData, { playerId, targetPlayerId, card }: CardOnEffectParams) {
    if (targetPlayerId === 0) {
      GameEventCenter.emit(GameEvent.CARD_ON_EFFECT, {
        card: this,
        handler: "promptSendMessage",
        params: {
          cardId: card.cardId,
        },
      } as CardOnEffect);
    }
  }

  promptSendMessage(gui: GameManager, params) {
    if (!gui.isRecord) {
      const { cardId } = params;
      const handCardContainer = gui.gameLayer.handCardContainer;
      gui.uiLayer.playerActionManager.clearAction();
      gui.uiLayer.playerActionManager.setDefaultAction(
        new PlayerAction({
          actions: [
            {
              handler: () =>
                new Promise((resolve, reject) => {
                  gui.gameLayer.startSelectHandCards({ num: 1 });
                  for (let item of handCardContainer.data.list) {
                    if ((<Card>item).id === cardId) {
                      handCardContainer.selectCard(<Card>item);
                      break;
                    }
                  }
                  gui.gameLayer.pauseSelectPlayers();
                  resolve(null);
                }),
            },
          ],
        }).union(gui.uiLayer.createDoSendMessageAction.apply(gui.uiLayer))
      );
      gui.uiLayer.playerActionManager.switchToDefault();
    }
  }

  secretButtonClicked(gui: GameManager, secret: number) {
    const card = gui.selectedHandCards.list[0];
    const player = gui.selectedPlayers.list[0];
    NetworkEventCenter.emit(NetworkEventToS.USE_MI_LING_TOS, {
      cardId: card.id,
      targetPlayerId: player.id,
      secret,
      seq: gui.seq,
    });
    this.onDeselected(gui);
  }
}
