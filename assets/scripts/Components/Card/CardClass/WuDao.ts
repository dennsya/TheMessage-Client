import { GameData } from "../../../Manager/GameData";
import { Card } from "../../../Components/Card/Card";
import { CardDefaultOption, CardOnEffectParams, CardType } from "../type";
import { GamePhase } from "../../../Manager/type";
import { NetworkEventCenter} from "../../../Event/EventTarget";
import { NetworkEventToS } from "../../../Event/type";
import { GameManager } from "../../../Manager/GameManager";

export class WuDao extends Card {
  public readonly availablePhases = [GamePhase.FIGHT_PHASE];

  constructor(option: CardDefaultOption) {
    super({
      id: option.id,
      name: "误导",
      type: CardType.WU_DAO,
      src: "WuDao",
      direction: option.direction,
      color: option.color,
      lockable: option.lockable,
      status: option.status,
      gameObject: option.gameObject,
    });
  }

  onSelectedToPlay(gui: GameManager): void {
    const tooltip = gui.tooltip;
    tooltip.setText(`请选择误导的目标`);
    const neighbors = gui.data.getPlayerNeighbors(gui.data.messagePlayerId);
    gui.gameLayer.startSelectPlayers({
      num: 1,
      filter: (player) => {
        return neighbors.indexOf(player) !== -1;
      },
      onSelect: (player) => {
        tooltip.setText(`是否使用误导？`);
        tooltip.buttons.setButtons([
          {
            text: "确定",
            onclick: () => {
              NetworkEventCenter.emit(NetworkEventToS.USE_WU_DAO_TOS, {
                cardId: this.id,
                targetPlayerId: player.id,
                seq: gui.seq,
              });
              this.onDeselected(gui);
            },
          },
        ]);
      },
    });
  }

  onDeselected(gui: GameManager) {
    gui.gameLayer.stopSelectPlayers();
  }

  onEffect(gameData: GameData, { targetPlayerId }: CardOnEffectParams) {
    gameData.messagePlayerId = targetPlayerId;
  }
}