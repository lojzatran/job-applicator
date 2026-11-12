import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Job } from './job.entity';
import { Cv } from './cv.entity';
import { DatabaseEntity } from './databaseEntity.interface';

@Entity('job_application')
export class JobApplication implements DatabaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  @ManyToOne(() => Job)
  job!: Job;

  @ManyToOne(() => Cv, (cv) => cv.jobApplications, { nullable: true })
  cv?: Cv | null;

  @Column({ nullable: true })
  coverLetter?: string;

  @Column({ nullable: true })
  status?: 'processing' | 'applied' | 'not-applied' | 'dismissed';

  @Column({ nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt?: Date;
}
