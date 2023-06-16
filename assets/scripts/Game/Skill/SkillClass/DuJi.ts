import {
  skill_du_ji_a_toc,
  skill_du_ji_b_toc,
  skill_du_ji_c_toc,
  skill_wait_for_du_ji_b_toc,
} from "../../../../protobuf/proto";
import { NetworkEventCenter, GameEventCenter, ProcessEventCenter } from "../../../Event/EventTarget";
import { NetworkEventToC, GameEvent, NetworkEventToS, ProcessEvent } from "../../../Event/type";
import { CardActionLocation, GamePhase, WaitingType } from "../../../GameManager/type";
import { GameData } from "../../../UI/Game/GameWindow/GameData";
import { Card } from "../../Card/Card";
import { CardColor } from "../../Card/type";
import { Character } from "../../Character/Character";
import { CharacterStatus } from "../../Character/type";
import { GameLog } from "../../GameLog/GameLog";
import { Player } from "../../Player/Player";
import { ActiveSkill } from "../Skill";

export class DuJi extends ActiveSkill {
  private usageCount: number = 0;
  private isSelfTurn: boolean = false;

  get useable() {
    return this.usageCount === 0 && this.isSelfTurn && this.character.status === CharacterStatus.FACE_DOWN;
  }

  constructor(character: Character) {
    super({
      name: "毒计",
      character,
      description:
        "你的争夺阶段限一次，你可以翻开此角色牌，然后指定两名其他角色，令他们互相抽取对方的一张手牌并展示之，你将展示的牌加入你的手牌，若展示的是黑色牌，你可以改为令抽取者选择一项：\n♦将其置入自己的情报区。\n♦将其置入对方的情报区。",
      useablePhase: [GamePhase.FIGHT_PHASE],
    });
  }

  init(gameData: GameData, player: Player) {
    NetworkEventCenter.on(
      NetworkEventToC.SKILL_DU_JI_A_TOC,
      (data) => {
        this.onEffectA(gameData, data);
      },
      this
    );
    NetworkEventCenter.on(
      NetworkEventToC.SKILL_WAIT_FOR_DU_JI_B_TOC,
      (data) => {
        this.waitingForUseB(gameData, data);
      },
      this
    );
    NetworkEventCenter.on(
      NetworkEventToC.SKILL_DU_JI_B_TOC,
      (data) => {
        this.onEffectB(gameData, data);
      },
      this
    );
    NetworkEventCenter.on(
      NetworkEventToC.SKILL_DU_JI_C_TOC,
      (data) => {
        this.onEffectC(gameData, data);
      },
      this
    );
    GameEventCenter.on(GameEvent.FIGHT_PHASE_END, this.resetUsageCount, this);
    GameEventCenter.on(GameEvent.GAME_PHASE_CHANGE, this.onTurnChange, this);
  }

  dispose() {
    NetworkEventCenter.off(NetworkEventToC.SKILL_DU_JI_A_TOC);
    NetworkEventCenter.off(NetworkEventToC.SKILL_DU_JI_B_TOC);
    NetworkEventCenter.off(NetworkEventToC.SKILL_DU_JI_C_TOC);
    GameEventCenter.off(GameEvent.FIGHT_PHASE_END, this.resetUsageCount);
    GameEventCenter.off(GameEvent.GAME_TURN_CHANGE, this.onTurnChange);
  }

  resetUsageCount() {
    this.usageCount = 0;
  }

  onTurnChange({ turnPlayer }) {
    this.isSelfTurn = turnPlayer.id === 0;
  }

  onUse(gameData: GameData) {
    const tooltip = gameData.gameObject.tooltip;
    tooltip.setText(`请选择两名角色`);
    gameData.gameObject.startSelectPlayer({
      num: 2,
      filter: (player) => player.id !== 0,
    });
    tooltip.buttons.setButtons([
      {
        text: "确定",
        onclick: () => {
          NetworkEventCenter.emit(NetworkEventToS.SKILL_DU_JI_A_TOS, {
            targetPlayerIds: gameData.gameObject.selectedPlayers.list.map((player) => player.id),
            seq: gameData.gameObject.seq,
          });
        },
        enabled: () => gameData.gameObject.selectedPlayers.list.length === 2,
      },
      {
        text: "取消",
        onclick: () => {
          gameData.gameObject.promotUseHandCard("争夺阶段，请选择要使用的卡牌");
          this.gameObject.isOn = false;
        },
      },
    ]);
  }

  onEffectA(gameData: GameData, { playerId, targetPlayerIds, cards }: skill_du_ji_a_toc) {
    const gameLog = gameData.gameObject.gameLog;
    const player = gameData.playerList[playerId];
    const showCardsWindow = gameData.gameObject.showCardsWindow;
    const targetPlayer1 = gameData.playerList[targetPlayerIds[0]];
    const targetPlayer2 = gameData.playerList[targetPlayerIds[1]];

    let card1: Card, card2: Card;
    if (targetPlayerIds[0] === 0) {
      card2 = targetPlayer1.removeHandCard(cards[1]);
      targetPlayer2.removeHandCard(cards[0]);
      card1 = gameData.createCard(cards[0]);
      gameData.gameObject.handCardList.removeData(card2);
    } else if (targetPlayerIds[1] === 0) {
      card1 = targetPlayer1.removeHandCard(cards[0]);
      targetPlayer2.removeHandCard(cards[1]);
      card2 = gameData.createCard(cards[1]);
      gameData.gameObject.handCardList.removeData(card1);
    } else {
      targetPlayer1.removeHandCard(0);
      targetPlayer2.removeHandCard(0);
      card1 = gameData.createCard(cards[0]);
      card2 = gameData.createCard(cards[1]);
    }

    let blackCount = 0;

    if (card1.color.indexOf(CardColor.BLACK) === -1) {
      player.addHandCard(card1);
      gameData.gameObject.cardAction.addCardToHandCard({
        player,
        card: card1,
        from: { location: CardActionLocation.PLAYER_HAND_CARD, player: targetPlayer1 },
      });
    } else {
      targetPlayer2.addHandCard(card1);
      gameData.gameObject.cardAction.addCardToHandCard({
        player: targetPlayer2,
        card: card1,
        from: { location: CardActionLocation.PLAYER_HAND_CARD, player: targetPlayer1 },
      });
      ++blackCount;
    }
    if (card2.color.indexOf(CardColor.BLACK) === -1) {
      player.addHandCard(card2);
      gameData.gameObject.cardAction.addCardToHandCard({
        player: player,
        card: card2,
        from: { location: CardActionLocation.PLAYER_HAND_CARD, player: targetPlayer2 },
      });
    } else {
      targetPlayer1.addHandCard(card2);
      gameData.gameObject.cardAction.addCardToHandCard({
        player: targetPlayer1,
        card: card2,
        from: { location: CardActionLocation.PLAYER_HAND_CARD, player: targetPlayer2 },
      });
      ++blackCount;
    }

    showCardsWindow.show({
      title: "【毒计】展示抽到的手牌",
      limit: 0,
      cardList: cards.map((card) => gameData.createCard(card)),
      tags: targetPlayerIds.map((id) => {
        const player = gameData.playerList[id];
        return `【${player.seatNumber + 1}号】${player.character.name}`;
      }),
      buttons: [
        {
          text: "关闭",
          onclick: () => {
            showCardsWindow.hide();
          },
        },
      ],
    });

    if (blackCount === 0) {
      if (playerId === 0) {
        this.gameObject.isOn = false;
      }
      ++this.usageCount;
    } else {
      this.gameObject?.lock();
    }

    gameLog.addData(new GameLog(`【${player.seatNumber + 1}号】${player.character.name}使用技能【毒计】`));
  }

  waitingForUseB(
    gameData: GameData,
    { playerId, targetPlayerIds, cardIds, waitingSecond, seq }: skill_wait_for_du_ji_b_toc
  ) {
    ProcessEventCenter.emit(ProcessEvent.START_COUNT_DOWN, {
      playerId: playerId,
      second: waitingSecond,
      type: WaitingType.HANDLE_SKILL,
      seq: seq,
    });

    if (playerId === 0) {
      const tooltip = gameData.gameObject.tooltip;
      tooltip.setText("请选择一个抽取黑色牌的角色，让他选择一项");
      gameData.gameObject.startSelectPlayer({
        num: 1,
        filter: (player) => targetPlayerIds.indexOf(player.id) !== -1,
      });
      tooltip.buttons.setButtons([
        {
          text: "确定",
          onclick: () => {
            const selectedPlayer = gameData.gameObject.selectedPlayers.list[0];
            NetworkEventCenter.emit(NetworkEventToS.SKILL_DU_JI_B_TOS, {
              enable: true,
              cardId: cardIds[targetPlayerIds.indexOf(selectedPlayer.id)],
              seq: seq,
            });
          },
          enabled: () => gameData.gameObject.selectedPlayers.list.length > 0,
        },
        {
          text: "取消",
          onclick: () => {
            NetworkEventCenter.emit(NetworkEventToS.SKILL_DU_JI_B_TOS, {
              enable: false,
              seq: seq,
            });
          },
        },
      ]);
    }
  }

  onEffectB(
    gameData: GameData,
    { playerId, enable, waitingPlayerId, targetPlayerId, card, waitingSecond, seq }: skill_du_ji_b_toc
  ) {
    if (enable) {
      ProcessEventCenter.emit(ProcessEvent.START_COUNT_DOWN, {
        playerId: waitingPlayerId,
        second: waitingSecond,
        type: WaitingType.HANDLE_SKILL,
        seq: seq,
      });

      const gameLog = gameData.gameObject.gameLog;
      const player = gameData.playerList[playerId];
      const waitingPlayer = gameData.playerList[waitingPlayerId];

      if (waitingPlayerId === 0) {
        const tooltip = gameData.gameObject.tooltip;
        tooltip.setText("请选择将牌置入谁的情报区");
        tooltip.buttons.setButtons([
          {
            text: "自己",
            onclick: () => {
              NetworkEventCenter.emit(NetworkEventToS.SKILL_DU_JI_C_TOS, {
                inFrontOfMe: true,
                seq: seq,
              });
            },
          },
          {
            text: "对方",
            onclick: () => {
              NetworkEventCenter.emit(NetworkEventToS.SKILL_DU_JI_C_TOS, {
                inFrontOfMe: false,
                seq: seq,
              });
            },
          },
        ]);
      }

      gameLog.addData(
        new GameLog(
          `【${player.seatNumber + 1}号】${player.character.name}让【${waitingPlayer.seatNumber + 1}号】${
            waitingPlayer.character.name
          }选择一项`
        )
      );
    }
  }

  onEffectC(gameData: GameData, { playerId, waitingPlayerId, targetPlayerId, card }: skill_du_ji_c_toc) {
    const gameLog = gameData.gameObject.gameLog;
    const player = gameData.playerList[playerId];
    const waitingPlayer = gameData.playerList[waitingPlayerId];
    const targetPlayer = gameData.playerList[targetPlayerId];

    let handCard = waitingPlayer.removeHandCard(card.id);
    if (!handCard) {
      waitingPlayer.removeHandCard(0);
      handCard = gameData.createCard(card);
    }

    if (waitingPlayerId === 0) {
      gameData.gameObject.handCardList.removeData(handCard);
    }
    targetPlayer.addMessage(handCard);
    gameData.gameObject.cardAction.addCardToMessageZone({
      player: targetPlayer,
      card: handCard,
      from: { location: CardActionLocation.PLAYER_HAND_CARD, player: waitingPlayer },
    });

    gameLog.addData(
      new GameLog(
        `【${waitingPlayer.seatNumber + 1}号】${waitingPlayer.character.name}把${gameLog.formatCard(handCard)}置入${
          targetPlayer.seatNumber + 1
        }号】${targetPlayer.character.name}的情报区`
      )
    );

    if (playerId === 0) {
      this.gameObject?.unlock();
      this.gameObject.isOn = false;
    }
    ++this.usageCount;
  }
}
