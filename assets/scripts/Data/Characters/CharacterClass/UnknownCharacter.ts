import { Character } from "../Character";
import { Sex, CharacterStatus } from "../type";
import { Skill } from "../../Skills/Skill";

export class UnknownCharacter extends Character {
  constructor() {
    super({
      id: 0,
      name: "未知角色",
      sprite: "images/characters/Unknown",
      status: CharacterStatus.FACE_DOWN,
      sex: Sex.UNKNOWN,
      skills: [] as Skill[],
    });
  }
}