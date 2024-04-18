import { Character } from "../Character";
import { Sex, CharacterStatus } from "../type";
import { CharacterEntity } from "../CharacterEntity";
import { BianZeTong } from "../../Skill/SkillClass/BianZeTong";

export class ChenDaEr extends Character {
  constructor(entity?: CharacterEntity) {
    super({
      id: 46,
      name: "陈大耳",
      sprite: "images/characters/NoPanting",
      status: CharacterStatus.FACE_UP,
      sex: Sex.MALE,
      entity: entity,
    });
    this.setSkills([new BianZeTong(this)]);
  }
}