import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DatabaseEntity } from './databaseEntity.interface';

@Entity('job')
export class Job implements DatabaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  url!: string;

  @Column()
  title!: string;

  @Column()
  company!: string;

  @Column()
  description!: string;

  @Column()
  source!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
