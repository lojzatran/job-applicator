import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobApplication } from './job-application.entity';

@Entity('cv')
export class Cv {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  @Column()
  path!: string;

  @Column()
  rawText!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  skills!: string[] | null;

  @Column({ type: 'text', array: true, nullable: true })
  experience!: string[] | null;

  @Column({ type: 'text', array: true, nullable: true })
  projects!: string[] | null;

  @Column({ type: 'text', array: true, nullable: true })
  education!: string[] | null;

  @Column({ type: 'text', array: true, nullable: true })
  other!: string[] | null;

  @Column({ unique: true })
  hash!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => JobApplication, (jobApplication) => jobApplication.cv)
  jobApplications!: Promise<JobApplication[]>;
}
