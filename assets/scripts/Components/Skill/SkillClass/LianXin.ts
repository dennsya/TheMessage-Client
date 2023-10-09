import { TriggerSkill } from "../Skill";
import { Character } from "../../Chatacter/Character";
import { GameEvent, NetworkEventToC, NetworkEventToS } from "../../../Event/type";
import { GameEventCenter, NetworkEventCenter } from "../../../Event/EventTarget";
import { GameData } from "../../../Manager/GameData";
import { PlayerAction } from "../../../Utils/PlayerAction/PlayerAction";
import { PlayerActionStep } from "../../../Utils/PlayerAction/PlayerActionStep";
import { GameManager } from "../../../Manager/GameManager";
import { skill_lian_xin_toc } from "../../../../protobuf/proto";
import { GameLog } from "../../GameLog/GameLog";
import { Player } from "../../Player/Player";
import { PlayerActionStepName } from "../../../Utils/PlayerAction/type";
import { Card } from "../../Card/Card";
import { CardUsableStatus } from "../../Card/type";
import { CardActionLocation } from "../../../Manager/type";

export class LianXin extends TriggerSkill {
  constructor(character: Character) {
    super({
      name: "联信",
      character,
      description:
        "你接收其他角色传出的情报后，可以翻开此角色，摸两张牌，然后将一张含有不同颜色的手牌置入传出者的情报区。",
    });
  }

  init(gameData: GameData, player: Player) {
    NetworkEventCenter.on(
      NetworkEventToC.SKILL_LIAN_XIN_TOC,
      (data) => {
        this.onEffect(gameData, data);
      },
      this
    );
  }

  dispose() {
    NetworkEventCenter.off(NetworkEventToC.SKILL_LIAN_XIN_TOC);
  }

  onTrigger(gui: GameManager, params): void {
    const tooltip = gui.tooltip;
    PlayerAction.addStep({
      step: new PlayerActionStep({
        handler: (data, { next, prev }) => {
          tooltip.setText(`你接收了其他人传出的情报，是否使用【联信】？`);
          tooltip.buttons.setButtons([
            {
              text: "确定",
              onclick: () => {
                next();
              },
            },
            {
              text: "取消",
              onclick: () => {
                prev();
              },
            },
          ]);
        },
      }),
    })
      .addStep({
        step: PlayerActionStepName.SELECT_HAND_CARDS,
        data: {
          filter: (card: Card) => {
            const messages = gui.data.selfPlayer.getMessagesCopy();
            const color = messages[messages.length - 1].color[0];
            if (card.color.length > 1 || card.color[0] !== color) {
              return CardUsableStatus.USABLE;
            } else {
              return CardUsableStatus.UNUSABLE;
            }
          },
        },
      })
      .onComplete((data) => {
        NetworkEventCenter.emit(NetworkEventToS.SKILL_LIAN_LUO_TOS, {
          cardId: data[0].cards[0].id,
          seq: gui.seq,
        });
      })
      .onCancel(() => {
        NetworkEventCenter.emit(NetworkEventToS.END_RECEIVE_PHASE_TOS, {
          seq: gui.seq,
        });
      })
      .start();
  }

  onEffect(gameData: GameData, { playerId, targetPlayerId, card }: skill_lian_xin_toc) {
    const player = gameData.playerList[playerId];
    const targetPlayer = gameData.playerList[targetPlayerId];
    const gameLog = gameData.gameLog;

    GameEventCenter.emit(GameEvent.PLAYER_USE_SKILL, {
      player,
      skill: this,
    });

    const handCard = gameData.playerRemoveHandCard(player, card);
    targetPlayer.addMessage(handCard);
    GameEventCenter.emit(GameEvent.MESSAGE_PLACED_INTO_MESSAGE_ZONE, {
      player: targetPlayer,
      message: handCard,
      from: {
        location: CardActionLocation.PLAYER_HAND_CARD,
        player,
      },
    });

    gameLog.addData(
      new GameLog(
        `${gameLog.formatPlayer(player)}将手牌${gameLog.formatCard(handCard)}置入${gameLog.formatPlayer(
          targetPlayer
        )}的情报区`
      )
    );

    GameEventCenter.emit(GameEvent.SKILL_HANDLE_FINISH, {
      player,
      skill: this,
    });
  }
}