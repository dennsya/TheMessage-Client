import { GameEvent } from "../../../Event/type";
import { ActiveSkill } from "../Skill";
import { Player } from "../../Player/Player";
import { Character } from "../../Character/Character";
import { PlayerReceiveMessage } from "../../../Event/GameEventType";
import { CardColor } from "../../Card/type";

export class JianRen extends ActiveSkill {
  constructor(character: Character) {
    super({
      name: "坚韧",
      character: character,
      description:
        "你接收黑色情报后，可以展示牌堆顶的一张牌，若是黑色牌，则将展示的牌加入你的手牌，并从一名角色的情报区弃置一张黑色情报。",
      condition: [
        {
          event: GameEvent.PLAYER_RECEIVE_MESSAGE,
          enabled({ player, message }: PlayerReceiveMessage) {
            if (player.character === this.character && message.color.indexOf(CardColor.BLACK) !== -1) {
              return true;
            }
          },
        },
      ],
    });
  }

  onUse() {}
}
