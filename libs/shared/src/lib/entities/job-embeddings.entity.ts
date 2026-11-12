import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Job } from './job.entity';
import { DatabaseEntity } from './databaseEntity.interface';

@Entity('job_embedding')
@Unique('UQ_job_embedding_content_model_chunk', [
  'jobId',
  'contentHash',
  'model',
  'chunkIndex',
])
export class JobEmbedding implements DatabaseEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_job_embedding' })
  id!: number;

  @Column()
  jobId!: number;

  @ManyToOne(() => Job, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'jobId',
    foreignKeyConstraintName: 'FK_job_embedding_job',
  })
  job!: Job;

  @Column({ length: 64 })
  contentHash!: string;

  @Column()
  model!: string;

  /**
   * Obcas byvaji popisy u inzeratu dlouhe. Pro tyto pripady rozdelime jeden popis na 2 casti
   * a vytvarime separatne embeddingy pro kazdou cast
   */
  @Column()
  chunkIndex!: number;

  @Column({ type: 'vector' })
  embedding!: number[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'now()' })
  createdAt!: Date;
}
